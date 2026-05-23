import { environment } from '../../../environments/environment';

/**
 * `ADMIN_UI_AUTH0_ENABLED` / CI `STAFF_AUTH0_ENABLED` is set — staff expects Auth0,
 * even if client id is not yet configured.
 */
export function isAuth0Requested(): boolean {
  return !!environment.auth0.requested;
}

/** Auth0 SDK is wired (`provideAuth0`, bearer interceptor) and Universal Login can run. */
export function isAuth0RuntimeConfigured(): boolean {
  const a = environment.auth0;
  return !!(a.enabled && a.domain && a.clientId);
}

/** Requested Auth0 but domain or client id is missing — do not allow dev sessionStorage login. */
export function isAuth0EnvIncomplete(): boolean {
  return isAuth0Requested() && !isAuth0RuntimeConfigured();
}

/**
 * `returnTo` for Auth0 logout — must match an entry in Auth0 **Allowed Logout URLs** exactly.
 * Uses `ADMIN_UI_AUTH0_LOGOUT_RETURN_TO` when set; otherwise `{origin}/auth/login`.
 */
export function auth0LogoutReturnToUrl(): string | undefined {
  const explicit = environment.auth0.logoutReturnTo?.trim();
  if (explicit) {
    return explicit;
  }
  if (typeof window !== 'undefined' && window.location?.origin) {
    return `${window.location.origin}/auth/login`;
  }
  return undefined;
}
