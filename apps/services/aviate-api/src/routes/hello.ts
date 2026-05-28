import type { RequestHandler } from 'express';

export function createHelloHandler(
  service: string,
  segment: string
): RequestHandler {
  return (req, res) => {
    const sub = req.auth?.sub ?? 'unknown';
    res.status(200).json({
      message: `Hello from ${service}`,
      segment,
      service,
      authenticated: true,
      principal: { sub },
    });
  };
}
