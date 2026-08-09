import { randomUUID } from 'node:crypto';

import { exportJWK, generateKeyPair, importJWK, SignJWT, type JWK } from 'jose';

import { SPECTRA_M2M_AUDIENCE_DEFAULT, SPECTRA_M2M_ISSUER_DEFAULT } from '@spectra/auth';

type M2mPrivateKey = Awaited<ReturnType<typeof importJWK>>;

let cachedPair: { privateKey: M2mPrivateKey; publicJwk: JWK; kid: string } | null = null;

function normalizeIssuer(raw: string): string {
  const t = raw.trim();
  return t.endsWith('/') ? t : `${t}/`;
}

export async function loadM2mSigningMaterial(): Promise<{
  privateKey: M2mPrivateKey;
  publicJwk: JWK;
  kid: string;
}> {
  const raw = process.env['M2M_ES256_PRIVATE_JWK']?.trim();
  if (raw) {
    const jwk = JSON.parse(raw) as JWK & { kid?: string };
    const privateKey = await importJWK(jwk);
    const publicJwk = { ...jwk } as JWK & { d?: string };
    delete publicJwk.d;
    const kid = typeof jwk.kid === 'string' ? jwk.kid : 'spectra-m2m-1';
    return { privateKey, publicJwk: publicJwk as JWK, kid };
  }
  if (process.env['NODE_ENV'] === 'production') {
    throw new Error('M2M_ES256_PRIVATE_JWK is required in production.');
  }
  if (!cachedPair) {
    const { privateKey, publicKey } = await generateKeyPair('ES256');
    const pub = (await exportJWK(publicKey)) as JWK;
    const kid = 'spectra-m2m-dev';
    pub.kid = kid;
    pub.use = 'sig';
    pub.alg = 'ES256';
    cachedPair = { privateKey, publicJwk: pub, kid };
  }
  return cachedPair;
}

export async function mintM2mAccessJwt(params: {
  issuer: string;
  audience: string;
  scope: string;
  clientId: string;
  integrationId: string;
  orgId: string;
  /** Runtime tenant ID — included as `tenant_id` claim when present. */
  tenantId?: string | null;
  clientName: string;
  ttlSeconds: number;
}): Promise<{ token: string; jti: string; exp: number; iat: number }> {
  const { privateKey, kid } = await loadM2mSigningMaterial();
  const jti = randomUUID();
  const iat = Math.floor(Date.now() / 1000);
  const exp = iat + params.ttlSeconds;
  const claims: Record<string, unknown> = {
    scope: params.scope,
    client_id: params.clientId,
    integration_id: params.integrationId,
    org_id: params.orgId,
    client_name: params.clientName,
  };
  if (params.tenantId) claims['tenant_id'] = params.tenantId;
  const jwt = await new SignJWT(claims)
    .setProtectedHeader({ alg: 'ES256', kid })
    .setIssuer(params.issuer)
    .setAudience(params.audience)
    .setSubject(params.clientId)
    .setIssuedAt(iat)
    .setExpirationTime(exp)
    .setJti(jti)
    .sign(privateKey);
  return { token: jwt, jti, exp, iat };
}

export function resolvedIssuer(): string {
  return normalizeIssuer(
    process.env['AUTH_ISSUER_OVERRIDE']?.trim() ||
      process.env['SPECTRA_M2M_ISSUER']?.trim() ||
      SPECTRA_M2M_ISSUER_DEFAULT
  );
}

export function resolvedAudience(): string {
  return process.env['SPECTRA_M2M_AUDIENCE']?.trim() || SPECTRA_M2M_AUDIENCE_DEFAULT;
}
