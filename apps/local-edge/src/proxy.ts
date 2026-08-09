import type { Express } from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';

function upstream(name: string, fallback: string): string {
  const v = process.env[name]?.trim();
  return (v && v.length > 0 ? v : fallback).replace(/\/$/, '');
}

export function mountServiceProxies(app: Express): void {
  const aviate = upstream('AVIATE_API_URL', 'http://127.0.0.1:3001');
  const auth = upstream('SPECTRA_AUTH_API_URL', 'http://127.0.0.1:9100');
  const seq = upstream('SEQ_API_URL', 'http://127.0.0.1:3003');
  const quantum = upstream('QUANTUM_API_URL', 'http://127.0.0.1:3004');
  const corridor = upstream('CORRIDOR_API_URL', 'http://127.0.0.1:3005');

  app.use(
    createProxyMiddleware({
      target: auth,
      changeOrigin: true,
      pathFilter: (pathname, req) =>
        pathname.startsWith('/.well-known/') ||
        (pathname === '/oauth/token' && req.method === 'POST'),
    })
  );

  const routes: { path: string; target: string }[] = [
    { path: '/v1/platform', target: aviate },
    { path: '/v1/seq', target: seq },
    { path: '/v1/quantum', target: quantum },
    { path: '/v1/corridor', target: corridor },
    { path: '/docs', target: aviate },
    { path: '/openapi.json', target: aviate },
    { path: '/integration', target: aviate },
  ];

  for (const { path: mountPath, target } of routes) {
    app.use(
      mountPath,
      createProxyMiddleware({
        target,
        changeOrigin: true,
        // Express strips the mount path before the proxy sees `req.url`, so without a rewrite
        // `/v1/platform/ready` would be forwarded as `/ready` while aviate-api serves `/v1/platform/ready`.
        pathRewrite: (pathname) => {
          const suffix =
            pathname === '' || pathname === '/' ? '' : pathname;
          return mountPath + suffix;
        },
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
