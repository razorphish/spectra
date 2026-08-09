import type { RequestHandler } from 'express';

export function createHelloHandler(
  service: string,
  segment: string
): RequestHandler {
  return (req, res) => {
    const m2m = req.auth?.m2m;
    const principal =
      m2m ?
        {
          type: 'm2m' as const,
          id: m2m.id,
          client_id: m2m.client_id,
          org_id: m2m.org_id,
          display_name: m2m.display_name,
          scopes: m2m.scopes,
          issuer: m2m.issuer,
          issued_at: m2m.issued_at,
          expires_at: m2m.expires_at,
          token_id: m2m.token_id,
        }
      : { type: 'user' as const, sub: req.auth?.sub ?? 'unknown' };
    res.status(200).json({
      message: `Hello from ${service}`,
      segment,
      service,
      authenticated: true,
      principal,
    });
  };
}
