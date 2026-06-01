import { config } from 'dotenv';
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { and, eq, isNull } from 'drizzle-orm';
import express from 'express';
import type { Request, Response } from 'express';

import {
  buildActorJson,
  CATALOG_IDS,
  getDb,
  integrations,
  m2mOauthClients,
  m2mTokenIssuanceLog,
  resolveSpectraDatabaseUrl,
} from '@spectra/database';

import { isKnownM2mScope } from '@spectra/auth';

import {
  mintM2mAccessJwt,
  loadM2mSigningMaterial,
  resolvedAudience,
  resolvedIssuer,
} from './lib/m2m-jwt';
import { verifyClientSecret } from './lib/verify-scrypt';

function workspaceRoot(): string {
  const env = process.env['NX_WORKSPACE_ROOT'];
  if (env && existsSync(join(env, 'nx.json'))) return env;
  let dir = __dirname;
  for (let i = 0; i < 24; i++) {
    if (existsSync(join(dir, 'nx.json'))) return dir;
    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return process.cwd();
}

const root = workspaceRoot();
for (const [p, o] of [
  [join(root, '.env'), false],
  [join(root, '.env.local'), true],
  [join(root, 'apps/services/auth-api', '.env.development'), true],
] as const) {
  if (existsSync(p)) {
    config({ path: p, override: o });
  }
}

function parseBasicAuth(header: string | undefined): { id: string; secret: string } | null {
  if (!header?.toLowerCase().startsWith('basic ')) return null;
  const b64 = header.slice(6).trim();
  try {
    const decoded = Buffer.from(b64, 'base64').toString('utf8');
    const idx = decoded.indexOf(':');
    if (idx < 0) return null;
    return { id: decoded.slice(0, idx), secret: decoded.slice(idx + 1) };
  } catch {
    return null;
  }
}

function mintEnabled(): boolean {
  return process.env['M2M_MINT_ENABLED'] === 'true';
}

function orgAllowlisted(orgId: string): boolean {
  const raw = process.env['M2M_ORG_ALLOWLIST']?.trim();
  if (!raw) return true;
  return raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .includes(orgId);
}

function parseScopeIntersection(requested: string | undefined, ceiling: string): string {
  const ceilingSet = new Set(ceiling.split(/\s+/).filter(Boolean));
  if (!requested?.trim()) {
    return [...ceilingSet].join(' ');
  }
  const req = requested.split(/\s+/).filter(Boolean);
  for (const s of req) {
    if (!isKnownM2mScope(s)) {
      throw Object.assign(new Error('invalid_scope'), { code: 'invalid_scope' });
    }
    if (!ceilingSet.has(s)) {
      throw Object.assign(new Error('invalid_scope'), { code: 'invalid_scope' });
    }
  }
  return req.join(' ');
}

async function handleToken(req: Request, res: Response): Promise<void> {
  if (!mintEnabled()) {
    res.status(403).json({
      error: 'unauthorized_client',
      error_description: 'M2M token mint is disabled (M2M_MINT_ENABLED).',
    });
    return;
  }
  if (!resolveSpectraDatabaseUrl()) {
    res.status(503).json({ error: 'server_error', error_description: 'Database not configured.' });
    return;
  }

  const body = req.body as Record<string, string | undefined>;
  const basic = parseBasicAuth(req.headers.authorization);
  const bodyId = body['client_id'];
  const bodySecret = body['client_secret'];
  if (basic && (bodyId || bodySecret)) {
    res.status(400).json({
      error: 'invalid_request',
      error_description:
        'Client credentials must be provided via Basic auth or request body, not both',
    });
    return;
  }
  const clientId = basic?.id || bodyId;
  const clientSecret = basic?.secret || bodySecret;
  if (!clientId || !clientSecret) {
    res.status(401).json({ error: 'invalid_client', error_description: 'Missing client credentials.' });
    return;
  }

  const grant = body['grant_type'];
  if (grant !== 'client_credentials') {
    res.status(400).json({ error: 'unsupported_grant_type', error_description: 'Only client_credentials is supported.' });
    return;
  }

  const db = getDb();
  const rows = await db
    .select({
      m2mId: m2mOauthClients.id,
      secretHash: m2mOauthClients.secretHash,
      grantedScopes: m2mOauthClients.grantedScopes,
      integrationId: integrations.id,
      integrationName: integrations.name,
      orgId: integrations.orgId,
      intDeleted: integrations.deletedAt,
      intStatus: integrations.statusId,
      clientDeleted: m2mOauthClients.deletedAt,
      clientStatus: m2mOauthClients.statusId,
    })
    .from(m2mOauthClients)
    .innerJoin(integrations, eq(m2mOauthClients.integrationId, integrations.id))
    .where(and(eq(m2mOauthClients.clientId, clientId), isNull(m2mOauthClients.deletedAt)))
    .limit(1);

  const row = rows[0];
  if (!row || !verifyClientSecret(clientSecret, row.secretHash)) {
    res.status(401).json({ error: 'invalid_client', error_description: 'Unknown client or invalid secret.' });
    return;
  }
  if (row.intDeleted || row.clientDeleted) {
    res.status(401).json({ error: 'invalid_client', error_description: 'Client is revoked.' });
    return;
  }
  if (row.intStatus === CATALOG_IDS.status.deleted || row.clientStatus === CATALOG_IDS.status.deleted) {
    res.status(401).json({ error: 'invalid_client', error_description: 'Client is revoked.' });
    return;
  }
  if (row.intStatus === CATALOG_IDS.status.archived || row.clientStatus === CATALOG_IDS.status.archived) {
    res.status(401).json({ error: 'invalid_client', error_description: 'Client is suspended.' });
    return;
  }

  if (!orgAllowlisted(row.orgId)) {
    res.status(403).json({ error: 'unauthorized_client', error_description: 'Org not allowlisted for M2M mint.' });
    return;
  }

  let scope: string;
  try {
    scope = parseScopeIntersection(body['scope'], row.grantedScopes);
  } catch (e) {
    const code = e && typeof e === 'object' && 'code' in e ? (e as { code: string }).code : 'invalid_scope';
    res.status(400).json({
      error: code,
      error_description: 'Requested scope is not allowed for this client.',
    });
    return;
  }

  const issuer = resolvedIssuer();
  const audience = resolvedAudience();
  const ttl = 600;
  const { token, jti, exp, iat } = await mintM2mAccessJwt({
    issuer,
    audience,
    scope,
    clientId,
    integrationId: row.integrationId,
    orgId: row.orgId,
    clientName: row.integrationName,
    ttlSeconds: ttl,
  });

  await db.insert(m2mTokenIssuanceLog).values({
    jti,
    m2mOauthClientId: row.m2mId,
    orgId: row.orgId,
    issuedAt: new Date(iat * 1000),
    expiresAt: new Date(exp * 1000),
    createdBy: buildActorJson({ name: 'auth-api', userId: null }),
  });

  res.status(200).json({
    access_token: token,
    token_type: 'Bearer',
    expires_in: ttl,
    scope,
  });
}

/** Default IPv4 loopback so peers using `http://127.0.0.1:9100` (e.g. aviate-api mint) connect; `localhost` can bind ::1-only on some Node/OS stacks. */
const host = process.env['HOST'] ?? '127.0.0.1';
const port = process.env['PORT'] ? Number(process.env['PORT']) : 9100;

if (process.env['NODE_ENV'] === 'production' && process.env['AUTH_ISSUER_OVERRIDE']?.trim()) {
  console.error('[auth-api] FATAL: AUTH_ISSUER_OVERRIDE must not be set in production.');
  process.exit(1);
}

const app = express();
app.use(express.urlencoded({ extended: false }));
app.use(express.json({ limit: '32kb' }));

/** RFC 8414 OAuth 2.0 Authorization Server Metadata (subset for client_credentials only). */
app.get('/.well-known/oauth-authorization-server', (req, res) => {
  const issuer = resolvedIssuer();
  const xfProto = req.get('x-forwarded-proto');
  const proto = (xfProto && xfProto.split(',')[0]?.trim()) || req.protocol || 'http';
  const hdrHost = req.get('host');
  const effectiveHost = hdrHost || `${host}:${port}`;
  const base = `${proto}://${effectiveHost}`.replace(/\/$/, '');
  res.json({
    issuer,
    token_endpoint: `${base}/oauth/token`,
    jwks_uri: `${base}/.well-known/jwks.json`,
    grant_types_supported: ['client_credentials'],
    token_endpoint_auth_methods_supported: ['client_secret_basic', 'client_secret_post'],
    scopes_supported: ['platform:read'],
  });
});

app.get('/.well-known/jwks.json', async (_req, res) => {
  try {
    const { publicJwk } = await loadM2mSigningMaterial();
    res.json({ keys: [publicJwk] });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'jwks_unavailable';
    res.status(500).json({ error: 'server_error', message: msg });
  }
});

app.post('/oauth/token', (req, res, next) => {
  void handleToken(req, res).catch(next);
});

app.get('/', (_req, res) => {
  res.json({
    service: 'auth-api',
    oauth: '/oauth/token',
    jwks: '/.well-known/jwks.json',
    oauth_authorization_server_metadata: '/.well-known/oauth-authorization-server',
  });
});

app.use(
  (
    err: unknown,
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction
  ) => {
    const msg = err instanceof Error ? err.message : 'error';
    res.status(500).json({ error: 'server_error', message: msg });
  }
);

app.listen(port, host, () => {
  console.log(`[auth-api] http://${host}:${port}`);
});
