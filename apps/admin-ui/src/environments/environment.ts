export const environment = {
  production: true,
  apiBaseUrl: '',
  /** `admin` = private Auth0 app; `sandbox` = public-facing sandbox tenant (configure separately). */
  appTarget: 'admin' as const,
  auth0: {
    requested: false,
    enabled: false,
    domain: '',
    clientId: '',
    audience: '',
    logoutReturnTo: '',
    redirectUri: '',
  },
  telemetry: {
    enabled: false,
    dsn: '' as string | undefined,
  },
  /**
   * Empty = hide topbar link. Staff should open **full** catalog: `{aviate-origin}/integration/docs/`
   * (not `/docs`, which is the public limited spec). Set at deploy time, e.g. `STAFF_AVIATE_SWAGGER_URL` in CI.
   */
  aviateApiDocsUrl: '',
};
