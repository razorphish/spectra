import { createRemoteJWKSet, decodeJwt, jwtVerify } from 'jose';
import type { RequestHandler } from 'express';

function stripAuth0Domain(raw: string): string {
  return raw.replace(/^https?:\/\//, '').replace(/\/$/, '');
}

function defaultIssuerFromDomain(domain: string): string {
  return `https://${stripAuth0Domain(domain)}/`;
}

/**
 * Validates Auth0-issued **access tokens** (RS256 via JWKS).
 *
 * Env (production-like):
 * - `AUTH0_DOMAIN` — tenant host, e.g. `dev-xxx.us.auth0.com`
 * - `AUTH0_AUDIENCE` — API identifier (must match SPA `authorizationParams.audience`)
 * - `AUTH0_ISSUER` — optional override when `iss` is not `https://{AUTH0_DOMAIN}/`
 *
 * Local-only escape hatch (never use in shared environments):
 * - `AUTH0_VERIFY_DISABLED=true` — decode JWT **without** verifying signature or claims
 */
export function createRequireAuth0AccessToken(): RequestHandler {
  const domain = process.env['AUTH0_DOMAIN']?.trim();
  const audience = process.env['AUTH0_AUDIENCE']?.trim();
  const issuerOverride = process.env['AUTH0_ISSUER']?.trim();
  const verifyDisabled = process.env['AUTH0_VERIFY_DISABLED'] === 'true';

  if (verifyDisabled) {
    console.warn(
      '[admin-ui-api] AUTH0_VERIFY_DISABLED=true — JWTs are not cryptographically verified. Use only on a trusted local machine.'
    );
  } else if (!domain || !audience) {
    return (_req, res) => {
      res.status(503).json({
        error: 'auth_not_configured',
        message:
          'Set AUTH0_DOMAIN and AUTH0_AUDIENCE, or AUTH0_VERIFY_DISABLED=true for local development only.',
      });
    };
  }

  const issuer =
    issuerOverride?.length ?
      (issuerOverride.endsWith('/') ? issuerOverride : `${issuerOverride}/`)
    : domain ? defaultIssuerFromDomain(domain)
    : undefined;

  const jwks =
    domain && !verifyDisabled ?
      createRemoteJWKSet(
        new URL(
          `https://${stripAuth0Domain(domain)}/.well-known/jwks.json`
        )
      )
    : undefined;

  return async (req, res, next) => {
    const hdr = req.headers.authorization;
    if (!hdr?.toLowerCase().startsWith('bearer ')) {
      res.status(401).json({
        error: 'missing_token',
        message: 'Authorization: Bearer <access_token> is required.',
      });
      return;
    }
    const token = hdr.slice(7).trim();
    if (!token) {
      res.status(401).json({
        error: 'missing_token',
        message: 'Bearer token is empty.',
      });
      return;
    }

    try {
      if (verifyDisabled) {
        const payload = decodeJwt(token);
        req.auth0AccessToken = token;
        req.auth = {
          sub: typeof payload.sub === 'string' ? payload.sub : 'unknown',
          claims: { ...payload } as Record<string, unknown>,
        };
        next();
        return;
      }

      if (!jwks || !issuer || !audience) {
        res.status(503).json({
          error: 'auth_not_configured',
          message: 'JWKS issuer/audience not configured.',
        });
        return;
      }

      const { payload } = await jwtVerify(token, jwks, {
        issuer,
        audience,
        clockTolerance: 5,
      });

      req.auth0AccessToken = token;
      req.auth = {
        sub: typeof payload.sub === 'string' ? payload.sub : 'unknown',
        claims: { ...payload } as Record<string, unknown>,
      };
      next();
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Token verification failed.';
      res.status(401).json({ error: 'invalid_token', message });
    }
  };
}
