import type { Express } from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';

function upstream(name: string, fallback: string): string {
  const v = process.env[name]?.trim();
  return (v && v.length > 0 ? v : fallback).replace(/\/$/, '');
}

export function mountServiceProxies(app: Express): void {
  const aviate = upstream('AVIATE_API_URL', 'http://127.0.0.1:3001');
  const seq = upstream('SEQ_API_URL', 'http://127.0.0.1:3003');
  const quantum = upstream('QUANTUM_API_URL', 'http://127.0.0.1:3004');
  const corridor = upstream('CORRIDOR_API_URL', 'http://127.0.0.1:3005');

  const routes: { path: string; target: string }[] = [
    { path: '/v1/platform', target: aviate },
    { path: '/v1/seq', target: seq },
    { path: '/v1/quantum', target: quantum },
    { path: '/v1/corridor', target: corridor },
    { path: '/docs', target: aviate },
    { path: '/openapi.json', target: aviate },
  ];

  for (const { path, target } of routes) {
    app.use(
      path,
      createProxyMiddleware({
        target,
        changeOrigin: true,
        on: {
          proxyReq(proxyReq, req) {
            const auth = req.headers.authorization;
            if (auth) {
              proxyReq.setHeader('authorization', auth);
            }
          },
        },
      })
    );
  }
}
