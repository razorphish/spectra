import { apiBaseUrlFromDotEnv, auth0FromDotEnv } from './environment.auth0.local';

export const environment = {
  production: false,
  apiBaseUrl: apiBaseUrlFromDotEnv,
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
