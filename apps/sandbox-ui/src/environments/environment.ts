export const environment = {
  production: true,
  apiBaseUrl: '',
  /**
   * Origin for public limited Swagger (`/docs`). Empty = use `apiBaseUrl`.
   * Set when REST calls use a different host than the public API docs gateway.
   */
  publicApiDocsBaseUrl: '',
  /** Public auth-api origin for OAuth metadata links (set at deploy time). */
  authApiPublicBaseUrl: '',
  customerSandboxLabel: 'Production',
  /** Marketing / discovery SPA URL (set at deploy time when different origin). */
  spectraMarketingUrl: '',
  auth0: {
    requested: false,
    enabled: false,
    domain: '',
    clientId: '',
    audience: '',
  },
};
