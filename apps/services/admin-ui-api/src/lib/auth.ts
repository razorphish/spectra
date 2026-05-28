import { createRequireAuth0AccessToken } from '@spectra/auth';

/** Shared staff Auth0 bearer middleware for admin-ui-api routes. */
export const requireAuth0AccessToken = createRequireAuth0AccessToken({
  logLabel: 'admin-ui-api',
});
