/// <reference path="./express.d.ts" />
import { createRemoteJWKSet, decodeJwt, jwtVerify } from 'jose';
import type { RequestHandler } from 'express';

import { SPECTRA_M2M_AUDIENCE_DEFAULT, SPECTRA_M2M_ISSUER_DEFAULT } from './m2m-constants';
import { scopesAllowRequest } from './scope-map';
import { createRequireAuth0AccessToken } from './require-auth0-access-token';

export type M2mPrincipal = {
  type: 'm2m';
  id: string;
  client_id: string;
  org_id: string;
  display_name: string;
  scopes: string[];
  issuer: string;
  issued_at: string;
  expires_at: string;
  token_id: string;
};

export type SpectraAccessTokenMiddlewareOptions = {
  logLabel?: string;
  /** e.g. `AVIATE_API` — reads `M2M_VERIFY_ENABLED_${segment}` when set. */
  m2mVerifyEnvSegment?: string;
  /**
   * Resolve M2M OAuth client status for Option C edge enforcement.
   * If omitted and M2M verify is on, requests with M2M tokens receive 503 (fail-closed).
   */
  loadM2mClientStatus?: (clientId: string) => Promise<'active' | 'revoked' | 'suspended'>;
  /** Clock skew seconds (JWT `iat`/`exp`); default 30. */
  clockSkewSeconds?: number;
};

function normalizeIssuer(raw: string): string {
  const t = raw.trim();
  return t.endsWith('/') ? t : `${t}/`;
}

function effectivePath(req: { baseUrl?: string; path: string }): string {
  const base = req.baseUrl ?? '';
  const p = req.path || '/';
  if (base && p === '/') return base;
  return `${base}${p}`;
}

function bearerChallenge(
  status: 401 | 403,
  error: string,
  description: string,
  extra?: { scope?: string }
): { status: 401 | 403; body: Record<string, string>; wwwAuthenticate: string } {
  const realm = SPECTRA_M2M_AUDIENCE_DEFAULT;
  let params = `realm="${realm}", error="${error}", error_description="${description.replace(/"/g, "'")}"`;
  if (extra?.scope) {
    params += `, scope="${extra.scope}"`;
  }
  return {
    status,
    body: { error, message: description },
    wwwAuthenticate: `Bearer ${params}`,
  };
}

type LruEntry = { status: 'active' | 'revoked' | 'suspended'; expiresAt: number };

const DEFAULT_STATUS_TTL_MS = 120_000;

function createStatusLru(ttlMs: number) {
  const map = new Map<string, LruEntry>();
  return {
    get(clientId: string): LruEntry | undefined {
      const e = map.get(clientId);
      if (!e) return undefined;
      if (Date.now() > e.expiresAt) {
        map.delete(clientId);
        return undefined;
      }
      return e;
    },
    set(clientId: string, status: 'active' | 'revoked' | 'suspended'): void {
      map.set(clientId, { status, expiresAt: Date.now() + ttlMs });
    },
    delete(clientId: string): void {
      map.delete(clientId);
    },
  };
}

/**
 * Validates **either** Auth0 user access tokens **or** Spectra M2M ES256 JWTs
 * based on unverified `iss` routing, then full `jwtVerify` on the correct branch.
 */
export function createRequireSpectraAccessToken(
  options: SpectraAccessTokenMiddlewareOptions = {}
): RequestHandler {
  const logLabel = options.logLabel ?? 'spectra-auth';
  const segment = options.m2mVerifyEnvSegment;
  const m2mVerifyOn =
    segment ?
      process.env[`M2M_VERIFY_ENABLED_${segment}`] === 'true'
    : process.env['M2M_VERIFY_ENABLED'] === 'true';

  const auth0Only = createRequireAuth0AccessToken({ logLabel });

  if (!m2mVerifyOn) {
    return auth0Only;
  }

  const m2mIssuer = normalizeIssuer(
    process.env['AUTH_ISSUER_OVERRIDE']?.trim() ||
      process.env['SPECTRA_M2M_ISSUER']?.trim() ||
      SPECTRA_M2M_ISSUER_DEFAULT
  );
  const m2mAudience =
    process.env['SPECTRA_M2M_AUDIENCE']?.trim() || SPECTRA_M2M_AUDIENCE_DEFAULT;

  const jwksUrlRaw =
    process.env['SPECTRA_M2M_JWKS_URL']?.trim() ||
    `${m2mIssuer.replace(/\/$/, '')}/.well-known/jwks.json`;

  let m2mJwks: ReturnType<typeof createRemoteJWKSet> | undefined;
  try {
    m2mJwks = createRemoteJWKSet(new URL(jwksUrlRaw));
  } catch {
    console.error(`[${logLabel}] Invalid SPECTRA_M2M_JWKS_URL / issuer for JWKS: ${jwksUrlRaw}`);
  }

  const domain = process.env['AUTH0_DOMAIN']?.trim();
  const audienceRaw = process.env['AUTH0_AUDIENCE']?.trim();
  const issuerOverride = process.env['AUTH0_ISSUER']?.trim();
  const verifyDisabled = process.env['AUTH0_VERIFY_DISABLED'] === 'true';

  const statusLru = createStatusLru(DEFAULT_STATUS_TTL_MS);
  const clockSkew = options.clockSkewSeconds ?? 30;

  return async (req, res, next) => {
    const hdr = req.headers.authorization;
    if (!hdr?.toLowerCase().startsWith('bearer ')) {
      const ch = bearerChallenge(401, 'missing_token', 'Authorization: Bearer token is required.');
      res.setHeader('WWW-Authenticate', ch.wwwAuthenticate);
      res.status(ch.status).json(ch.body);
      return;
    }
    const token = hdr.slice(7).trim();
    if (!token) {
      const ch = bearerChallenge(401, 'missing_token', 'Bearer token is empty.');
      res.setHeader('WWW-Authenticate', ch.wwwAuthenticate);
      res.status(ch.status).json(ch.body);
      return;
    }

    let iss: string | undefined;
    try {
      const decoded = decodeJwt(token);
      iss = typeof decoded.iss === 'string' ? normalizeIssuer(decoded.iss) : undefined;
    } catch {
      const ch = bearerChallenge(401, 'invalid_token', 'Malformed JWT.');
      res.setHeader('WWW-Authenticate', ch.wwwAuthenticate);
      res.status(ch.status).json(ch.body);
      return;
    }

    const isM2m = iss === m2mIssuer;

    try {
      if (isM2m) {
        if (!m2mJwks) {
          res.status(503).json({ error: 'auth_unavailable', message: 'M2M JWKS not configured.' });
          return;
        }
        const { payload } = await jwtVerify(token, m2mJwks, {
          issuer: m2mIssuer,
          audience: m2mAudience,
          clockTolerance: clockSkew,
        });

        const clientId =
          typeof payload['client_id'] === 'string' ? payload['client_id']
          : typeof payload.sub === 'string' ? payload.sub
          : '';
        if (!clientId) {
          const ch = bearerChallenge(401, 'invalid_token', 'M2M token missing client subject.');
          res.setHeader('WWW-Authenticate', ch.wwwAuthenticate);
          res.status(ch.status).json(ch.body);
          return;
        }

        if (!options.loadM2mClientStatus) {
          res.status(503).json({
            error: 'auth_unavailable',
            message: 'M2M status resolver is not configured on this service.',
          });
          return;
        }

        const cached = statusLru.get(clientId);
        let status: 'active' | 'revoked' | 'suspended';
        if (cached) {
          status = cached.status;
        } else {
          try {
            status = await options.loadM2mClientStatus(clientId);
            statusLru.set(clientId, status);
          } catch {
            res.status(503).json({
              error: 'auth_unavailable',
              message: 'Could not resolve integration status.',
            });
            return;
          }
        }
        if (status !== 'active') {
          const ch = bearerChallenge(401, 'client_revoked', 'Client or integration is not active.');
          res.setHeader('WWW-Authenticate', ch.wwwAuthenticate);
          res.status(ch.status).json(ch.body);
          return;
        }

        const scopeStr = typeof payload['scope'] === 'string' ? payload['scope'] : '';
        const scopes = scopeStr.split(/\s+/).filter(Boolean);
        const path = effectivePath(req);
        const { allowed, requiredScope } = scopesAllowRequest(scopes, req.method || 'GET', path);
        if (!allowed && requiredScope !== null) {
          const ch = bearerChallenge(
            403,
            'insufficient_scope',
            'Token does not include the required scope.',
            { scope: requiredScope }
          );
          res.setHeader('WWW-Authenticate', ch.wwwAuthenticate);
          res.status(ch.status).json(ch.body);
          return;
        }
        if (!allowed) {
          const ch = bearerChallenge(403, 'token_type_not_allowed', 'M2M token cannot access this route.');
          res.setHeader('WWW-Authenticate', ch.wwwAuthenticate);
          res.status(ch.status).json(ch.body);
          return;
        }

        const integrationId =
          typeof payload['integration_id'] === 'string' ? payload['integration_id'] : '';
        const orgId = typeof payload['org_id'] === 'string' ? payload['org_id'] : '';
        const clientName =
          typeof payload['client_name'] === 'string' ? payload['client_name'] : '';
        const jti = typeof payload.jti === 'string' ? payload.jti : '';
        const iat = typeof payload.iat === 'number' ? payload.iat : 0;
        const exp = typeof payload.exp === 'number' ? payload.exp : 0;

        const principal: M2mPrincipal = {
          type: 'm2m',
          id: integrationId,
          client_id: clientId,
          org_id: orgId,
          display_name: clientName,
          scopes,
          issuer: m2mIssuer,
          issued_at: new Date(iat * 1000).toISOString(),
          expires_at: new Date(exp * 1000).toISOString(),
          token_id: jti,
        };

        req.auth0AccessToken = token;
        req.auth = {
          type: 'm2m',
          sub: clientId,
          claims: { ...payload } as Record<string, unknown>,
          m2m: principal,
        };
        next();
        return;
      }

      // Auth0 branch (delegate behavior by reusing inner logic without second decode — re-verify)
      if (verifyDisabled) {
        const payload = decodeJwt(token);
        req.auth0AccessToken = token;
        req.auth = {
          type: 'user',
          sub: typeof payload.sub === 'string' ? payload.sub : 'unknown',
          claims: { ...payload } as Record<string, unknown>,
        };
        next();
        return;
      }

      if (!domain || !audienceRaw) {
        res.status(503).json({
          error: 'auth_not_configured',
          message: 'Set AUTH0_DOMAIN and AUTH0_AUDIENCE for user tokens.',
        });
        return;
      }

      const strip = (h: string) => h.replace(/^https?:\/\//, '').replace(/\/$/, '');
      const normalizeAud = (a: string) => a.trim().replace(/\/+$/, '');
      const audience = normalizeAud(audienceRaw);
      const issuerAuth0 =
        issuerOverride?.length ?
          (issuerOverride.endsWith('/') ? issuerOverride : `${issuerOverride}/`)
        : `https://${strip(domain)}/`;

      const jwksAuth0 = createRemoteJWKSet(
        new URL(`https://${strip(domain)}/.well-known/jwks.json`)
      );
      const { payload } = await jwtVerify(token, jwksAuth0, {
        issuer: issuerAuth0,
        audience,
        clockTolerance: clockSkew,
      });

      req.auth0AccessToken = token;
      req.auth = {
        type: 'user',
        sub: typeof payload.sub === 'string' ? payload.sub : 'unknown',
        claims: { ...payload } as Record<string, unknown>,
      };
      next();
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Token verification failed.';
      console.warn(`[${logLabel}] verify failed: ${message}`);
      const ch = bearerChallenge(401, 'invalid_token', message);
      res.setHeader('WWW-Authenticate', ch.wwwAuthenticate);
      res.status(ch.status).json(ch.body);
    }
  };
}
