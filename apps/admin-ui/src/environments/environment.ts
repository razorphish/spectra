export const environment = {
  production: true,
  apiBaseUrl: '',
  /** `admin` = private Auth0 app; `sandbox` = public-facing sandbox tenant (configure separately). */
  appTarget: 'admin' as const,
  auth0: {
    enabled: false,
    domain: '',
    clientId: '',
    audience: '',
    redirectUri: '',
  },
  telemetry: {
    enabled: false,
    dsn: '' as string | undefined,
  },
};
