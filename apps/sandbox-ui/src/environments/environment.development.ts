import {
  apiBaseUrlFromDotEnv,
  authApiPublicBaseUrlFromDotEnv,
  auth0FromDotEnv,
  publicApiDocsBaseUrlFromDotEnv,
} from './environment.auth0.local';

export const environment = {
  production: false,
  apiBaseUrl: apiBaseUrlFromDotEnv,
  publicApiDocsBaseUrl: publicApiDocsBaseUrlFromDotEnv,
  /** OAuth metadata / JWKS host for links in dashboard (see SANDBOX_UI_AUTH_API_PUBLIC_URL). */
  authApiPublicBaseUrl: authApiPublicBaseUrlFromDotEnv,
  /** Shown in dashboard for customer clarity. */
  customerSandboxLabel: 'Local development',
  /** Local `nx serve spectra-ui` (port 4200). */
  spectraMarketingUrl: 'http://localhost:4200',
  auth0: {
    requested: auth0FromDotEnv.requested,
    enabled: auth0FromDotEnv.enabled,
    domain: auth0FromDotEnv.domain,
    clientId: auth0FromDotEnv.clientId,
    audience: auth0FromDotEnv.audience,
  },
};
