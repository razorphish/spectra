import { apiBaseUrlFromDotEnv, auth0FromDotEnv, redirectUriFromDotEnv } from './environment.auth0.local';

export const environment = {
  production: false,
  apiBaseUrl: apiBaseUrlFromDotEnv,
  appTarget: 'admin' as const,
  auth0: {
    requested: auth0FromDotEnv.requested,
    enabled: auth0FromDotEnv.enabled,
    domain: auth0FromDotEnv.domain,
    clientId: auth0FromDotEnv.clientId,
    audience: auth0FromDotEnv.audience,
    /** Empty = logout uses `{origin}/auth/login`. Set when Auth0 allowlist cannot use dynamic origin. */
    logoutReturnTo: auth0FromDotEnv.logoutReturnTo,
    /** Empty = app.config uses `{origin}/auth/callback`. Set `ADMIN_UI_AUTH0_REDIRECT_URI` for a fixed URL. */
    redirectUri: redirectUriFromDotEnv,
  },
  telemetry: {
    enabled: false,
    dsn: undefined as string | undefined,
  },
};
