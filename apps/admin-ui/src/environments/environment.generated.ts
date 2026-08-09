/**
 * Default staff CI bundle environment. CI runs `scripts/write-admin-ui-build-environment.mjs`
 * before `nx build admin-ui --configuration=ci-staff` to overwrite this file with `STAFF_API_URL`
 * (and optional `STAFF_AUTH0_*` variables).
 */
export const environment = {
  production: true,
  apiBaseUrl: '',
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
    dsn: undefined as string | undefined,
  },
  aviateApiDocsUrl: '',
};
