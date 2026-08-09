/**
 * Dev spike: Backend-For-Frontend token-handler for sandbox-ui, mounted in local-edge
 * behind `BFF_ENABLED`. Proves the OAuth round-trip and the HttpOnly session cookie
 * before Angular is touched. Production would deploy this logic as a Lambda behind the
 * AWS HTTP API (see docs/plans/sandbox-ui-bff.md).
 *
 * Phase 0: /bff/login, /bff/callback, /bff/me, /bff/logout + JWE session cookie.
 * Phase 1 (done): /v1/* Bearer injection from the session + refresh-on-expiry (single-flight),
 *   cookie stripped from upstream, client Authorization ignored in BFF mode.
 * Phase 2 (done): CSRF — same-origin check + double-submit `bff_csrf` cookie / `X-CSRF-Token`
 *   header on unsafe methods (/v1/* + /bff/logout). SPA must echo the cookie in the header.
 * NOT yet included: Angular cutover (phase 3).
 */
import { createHash, randomBytes } from 'node:crypto';
import type { Express, Request, RequestHandler, Response } from 'express';
import { EncryptJWT, jwtDecrypt, createRemoteJWKSet, jwtVerify } from 'jose';

const SESSION_COOKIE = 'bff_session';
const TX_COOKIE = 'bff_tx'; // short-lived login transaction (state + PKCE verifier)
const CSRF_COOKIE = 'bff_csrf'; // double-submit token; JS-readable (not HttpOnly)
const CSRF_HEADER = 'x-csrf-token';
const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

type BffConfig = {
  origin: string;
  domain: string;
  audience: string;
  clientId: string;
  clientSecret: string;
  sessionKey: Uint8Array;
  secureCookies: boolean;
};

/** Session payload stored (encrypted) in the browser cookie. Tokens never leave the server unencrypted. */
type SessionClaims = {
  sub: string;
  email?: string;
  name?: string;
  at: string; // access token
  rt?: string; // refresh token
  ax: number; // access-token expiry (epoch seconds)
};

/** Reads config from env; returns null (with a log) when disabled or misconfigured. */
export function readBffConfig(): BffConfig | null {
  if (process.env['BFF_ENABLED'] !== 'true') return null;
  const origin = process.env['BFF_PUBLIC_ORIGIN']?.trim();
  const domain = process.env['AUTH0_DOMAIN']?.trim();
  const audience = process.env['AUTH0_AUDIENCE']?.trim();
  const clientId = process.env['AUTH0_BFF_CLIENT_ID']?.trim();
  const clientSecret = process.env['AUTH0_BFF_CLIENT_SECRET']?.trim();
  const secret = process.env['BFF_SESSION_SECRET']?.trim();
  const missing = { origin, domain, audience, clientId, clientSecret, secret };
  const absent = Object.entries(missing)
    .filter(([, v]) => !v)
    .map(([k]) => k);
  if (absent.length > 0) {
    console.warn(`[bff] BFF_ENABLED but missing: ${absent.join(', ')} — BFF routes NOT mounted.`);
    return null;
  }
  return {
    origin: origin!.replace(/\/$/, ''),
    domain: stripScheme(domain!),
    audience: audience!,
    clientId: clientId!,
    clientSecret: clientSecret!,
    // A256GCM needs a 32-byte key; derive deterministically from the secret.
    sessionKey: createHash('sha256').update(secret!).digest(),
    secureCookies: process.env['NODE_ENV'] === 'production',
  };
}

function stripScheme(domain: string): string {
  return domain.replace(/^https?:\/\//, '').replace(/\/$/, '');
}

function b64url(buf: Buffer): string {
  return buf.toString('base64url');
}

/** PKCE S256 challenge for a verifier string. Exported for the self-check. */
export function pkceChallenge(verifier: string): string {
  return b64url(createHash('sha256').update(verifier).digest());
}

function parseCookies(req: Request): Record<string, string> {
  const raw = req.headers.cookie;
  if (!raw) return {};
  const out: Record<string, string> = {};
  for (const part of raw.split(';')) {
    const idx = part.indexOf('=');
    if (idx === -1) continue;
    const k = part.slice(0, idx).trim();
    const v = part.slice(idx + 1).trim();
    if (k) out[k] = decodeURIComponent(v);
  }
  return out;
}

function setCookie(
  res: Response,
  name: string,
  value: string,
  cfg: BffConfig,
  maxAgeSec: number,
  opts: { httpOnly?: boolean } = {},
): void {
  const attrs = [`${name}=${encodeURIComponent(value)}`, 'Path=/', 'SameSite=Lax', `Max-Age=${maxAgeSec}`];
  if (opts.httpOnly !== false) attrs.push('HttpOnly'); // CSRF token cookie must stay JS-readable
  if (cfg.secureCookies) attrs.push('Secure');
  appendSetCookie(res, attrs.join('; '));
}

function clearCookie(res: Response, name: string, cfg: BffConfig): void {
  const attrs = [`${name}=`, 'HttpOnly', 'Path=/', 'SameSite=Lax', 'Max-Age=0'];
  if (cfg.secureCookies) attrs.push('Secure');
  appendSetCookie(res, attrs.join('; '));
}

function appendSetCookie(res: Response, cookie: string): void {
  const prev = res.getHeader('Set-Cookie');
  if (!prev) res.setHeader('Set-Cookie', cookie);
  else if (Array.isArray(prev)) res.setHeader('Set-Cookie', [...prev, cookie]);
  else res.setHeader('Set-Cookie', [String(prev), cookie]);
}

/** Issues a fresh double-submit CSRF token cookie (JS-readable) alongside the session. */
function issueCsrf(res: Response, cfg: BffConfig): void {
  setCookie(res, CSRF_COOKIE, b64url(randomBytes(18)), cfg, 12 * 3600, { httpOnly: false });
}

/**
 * CSRF defense for state-changing requests: (1) Origin/Referer must match our own origin,
 * and (2) the `X-CSRF-Token` header must equal the `bff_csrf` cookie (double-submit).
 * Safe methods always pass. Exported for the self-check.
 */
export function checkCsrf(req: Request, cfg: BffConfig): boolean {
  if (SAFE_METHODS.has(req.method)) return true;
  // (1) Same-origin: an attacker's cross-site fetch can't forge a matching Origin.
  const origin = typeof req.headers.origin === 'string' ? req.headers.origin : '';
  const referer = typeof req.headers.referer === 'string' ? req.headers.referer : '';
  const originOk = origin ? origin === cfg.origin : referer.startsWith(`${cfg.origin}/`);
  if (!originOk) return false;
  // (2) Double-submit: attacker can't read our cookie (SOP) to echo it in the header.
  const headerToken = req.headers[CSRF_HEADER];
  const sent = Array.isArray(headerToken) ? headerToken[0] : headerToken;
  const cookieToken = parseCookies(req)[CSRF_COOKIE];
  return Boolean(sent && cookieToken && sent === cookieToken);
}

/** Encrypts a JWE session cookie (dir + A256GCM). Exported for the self-check. */
export async function encryptSession(claims: SessionClaims, key: Uint8Array, ttl = '12h'): Promise<string> {
  return new EncryptJWT(claims as unknown as Record<string, unknown>)
    .setProtectedHeader({ alg: 'dir', enc: 'A256GCM' })
    .setIssuedAt()
    .setExpirationTime(ttl)
    .encrypt(key);
}

/** Decrypts a JWE session cookie; returns null on any failure. Exported for the self-check. */
export async function decryptSession(token: string, key: Uint8Array): Promise<SessionClaims | null> {
  try {
    const { payload } = await jwtDecrypt(token, key);
    return payload as unknown as SessionClaims;
  } catch {
    return null;
  }
}

/** GET /bff/login — start Authorization Code + PKCE against Auth0. */
function loginHandler(cfg: BffConfig): RequestHandler {
  return async (_req, res) => {
    const state = b64url(randomBytes(16));
    const verifier = b64url(randomBytes(32));
    // Stash state + verifier in a short-lived encrypted cookie (survives the redirect).
    const tx = await encryptSession(
      { sub: 'tx', at: state, rt: verifier, ax: 0 },
      cfg.sessionKey,
      '10m',
    );
    setCookie(res, TX_COOKIE, tx, cfg, 600);
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: cfg.clientId,
      redirect_uri: `${cfg.origin}/bff/callback`,
      scope: 'openid profile email offline_access',
      audience: cfg.audience,
      state,
      code_challenge: pkceChallenge(verifier),
      code_challenge_method: 'S256',
    });
    res.redirect(`https://${cfg.domain}/authorize?${params.toString()}`);
  };
}

/** GET /bff/callback — exchange the code for tokens and set the session cookie. */
function callbackHandler(cfg: BffConfig): RequestHandler {
  return async (req, res) => {
    const code = typeof req.query['code'] === 'string' ? req.query['code'] : '';
    const state = typeof req.query['state'] === 'string' ? req.query['state'] : '';
    const txCookie = parseCookies(req)[TX_COOKIE];
    const tx = txCookie ? await decryptSession(txCookie, cfg.sessionKey) : null;
    clearCookie(res, TX_COOKIE, cfg);
    if (!code || !tx || tx.at !== state || !tx.rt) {
      res.status(400).json({ error: 'invalid_state', message: 'Login transaction expired or mismatched.' });
      return;
    }
    let tokenRes: globalThis.Response;
    try {
      tokenRes = await fetch(`https://${cfg.domain}/oauth/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          grant_type: 'authorization_code',
          client_id: cfg.clientId,
          client_secret: cfg.clientSecret,
          code,
          redirect_uri: `${cfg.origin}/bff/callback`,
          code_verifier: tx.rt,
        }).toString(),
      });
    } catch {
      res.status(502).json({ error: 'token_exchange_unreachable' });
      return;
    }
    if (!tokenRes.ok) {
      res.status(401).json({ error: 'token_exchange_failed' });
      return;
    }
    const tok = (await tokenRes.json()) as {
      access_token: string;
      refresh_token?: string;
      id_token?: string;
      expires_in?: number;
    };
    let profile: { sub: string; email?: string; name?: string } = { sub: 'unknown' };
    if (tok.id_token) {
      try {
        const jwks = createRemoteJWKSet(new URL(`https://${cfg.domain}/.well-known/jwks.json`));
        const { payload } = await jwtVerify(tok.id_token, jwks, {
          issuer: `https://${cfg.domain}/`,
          audience: cfg.clientId,
        });
        profile = {
          sub: String(payload.sub ?? 'unknown'),
          email: typeof payload['email'] === 'string' ? payload['email'] : undefined,
          name: typeof payload['name'] === 'string' ? payload['name'] : undefined,
        };
      } catch {
        res.status(401).json({ error: 'id_token_invalid' });
        return;
      }
    }
    const session = await encryptSession(
      {
        sub: profile.sub,
        email: profile.email,
        name: profile.name,
        at: tok.access_token,
        rt: tok.refresh_token,
        ax: Math.floor(Date.now() / 1000) + (tok.expires_in ?? 3600),
      },
      cfg.sessionKey,
    );
    setCookie(res, SESSION_COOKIE, session, cfg, 12 * 3600);
    issueCsrf(res, cfg);
    res.redirect('/');
  };
}

/** GET /bff/me — profile from the session; never returns tokens. */
function meHandler(cfg: BffConfig): RequestHandler {
  return async (req, res) => {
    const cookie = parseCookies(req)[SESSION_COOKIE];
    const s = cookie ? await decryptSession(cookie, cfg.sessionKey) : null;
    if (!s) {
      res.status(401).json({ error: 'not_authenticated' });
      return;
    }
    res.json({ sub: s.sub, email: s.email, name: s.name });
  };
}

/** POST /bff/logout — clear the session and bounce through Auth0 logout. */
function logoutHandler(cfg: BffConfig): RequestHandler {
  return (req, res) => {
    if (!checkCsrf(req, cfg)) {
      res.status(403).json({ error: 'csrf_failed', message: 'Missing or invalid CSRF token.' });
      return;
    }
    clearCookie(res, SESSION_COOKIE, cfg);
    clearCookie(res, CSRF_COOKIE, cfg);
    const params = new URLSearchParams({ client_id: cfg.clientId, returnTo: cfg.origin });
    // Return the Auth0 logout URL as JSON so the SPA (which POSTs with the CSRF header) can navigate to it.
    res.json({ logoutUrl: `https://${cfg.domain}/v2/logout?${params.toString()}` });
  };
}

type TokenResponse = { access_token: string; refresh_token?: string; expires_in?: number };

// ponytail: per-instance single-flight so concurrent API calls share ONE refresh instead
// of stampeding Auth0. Keyed by refresh token. Move to a shared lock if multi-instance.
const refreshInFlight = new Map<string, Promise<TokenResponse | null>>();

async function refreshTokens(cfg: BffConfig, refreshToken: string): Promise<TokenResponse | null> {
  try {
    const r = await fetch(`https://${cfg.domain}/oauth/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        client_id: cfg.clientId,
        client_secret: cfg.clientSecret,
        refresh_token: refreshToken,
      }).toString(),
    });
    if (!r.ok) return null;
    return (await r.json()) as TokenResponse;
  } catch {
    return null;
  }
}

/**
 * Returns a valid access token for the request's session, refreshing (once, shared) when it is
 * within 60s of expiry and re-setting the session cookie. Returns null if no usable session.
 */
async function ensureAccessToken(req: Request, res: Response, cfg: BffConfig): Promise<string | null> {
  const cookie = parseCookies(req)[SESSION_COOKIE];
  const s = cookie ? await decryptSession(cookie, cfg.sessionKey) : null;
  if (!s) return null;
  const now = Math.floor(Date.now() / 1000);
  if (s.ax > now + 60) return s.at; // still comfortably valid
  if (!s.rt) return null; // expired and nothing to refresh with

  let pending = refreshInFlight.get(s.rt);
  if (!pending) {
    pending = refreshTokens(cfg, s.rt);
    refreshInFlight.set(s.rt, pending);
    void pending.finally(() => refreshInFlight.delete(s.rt));
  }
  const tok = await pending;
  if (!tok) return null;

  const updated: SessionClaims = {
    ...s,
    at: tok.access_token,
    rt: tok.refresh_token ?? s.rt, // honor refresh-token rotation
    ax: now + (tok.expires_in ?? 3600),
  };
  setCookie(res, SESSION_COOKIE, await encryptSession(updated, cfg.sessionKey), cfg, 12 * 3600);
  return tok.access_token;
}

/**
 * Phase 1: for `/v1/*` requests, replace any client Authorization with the Bearer from the
 * session cookie, and strip the cookie so the encrypted session never reaches backends.
 * Backends still enforce auth, so a missing/expired session simply proxies unauthenticated.
 */
function bffAuthMiddleware(cfg: BffConfig): RequestHandler {
  return async (req, res, next) => {
    if (!req.path.startsWith('/v1/')) {
      next();
      return;
    }
    // In BFF mode the browser must not supply its own bearer — prevent token smuggling.
    delete req.headers.authorization;
    // CSRF: reject unsafe methods that fail the origin + double-submit checks.
    if (!checkCsrf(req, cfg)) {
      delete req.headers.cookie;
      res.status(403).json({ error: 'csrf_failed', message: 'Missing or invalid CSRF token.' });
      return;
    }
    const token = await ensureAccessToken(req, res, cfg).catch(() => null);
    if (token) req.headers.authorization = `Bearer ${token}`;
    // Never forward the session cookie upstream.
    delete req.headers.cookie;
    next();
  };
}

/** Mounts the BFF routes when configured. No-op (returns false) otherwise. */
export function mountBff(app: Express): boolean {
  const cfg = readBffConfig();
  if (!cfg) return false;
  app.get('/bff/login', loginHandler(cfg));
  app.get('/bff/callback', callbackHandler(cfg));
  app.get('/bff/me', meHandler(cfg));
  app.post('/bff/logout', logoutHandler(cfg));
  // Phase 1: inject the session Bearer into /v1/* before the service proxies run.
  app.use(bffAuthMiddleware(cfg));
  console.log('[bff] mounted /bff/* + /v1 Bearer injection');
  return true;
}
