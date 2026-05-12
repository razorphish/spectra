export const environment = {
  production: false,
  apiBaseUrl: 'http://127.0.0.1:3002',
  appTarget: 'admin' as const,
  auth0: {
    enabled: false,
    domain: '',
    clientId: '',
    audience: '',
    redirectUri: typeof window !== 'undefined' ? `${window.location.origin}` : '',
  },
  telemetry: {
    enabled: false,
    dsn: undefined as string | undefined,
  },
};
