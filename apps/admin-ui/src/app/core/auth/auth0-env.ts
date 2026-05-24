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

/**
 * The Auth0 Management API identifier ends with `/api/v2`. It is not a valid audience for the
 * staff SPA + `admin-ui-api` — silent renewal and token exchange often fail with **400** on
 * `/authorize` (`prompt=none`, `response_mode=web_message`).
 */
export function isLikelyAuth0ManagementApiAudience(audience: string | undefined): boolean {
  const t = audience?.trim();
  if (!t) return false;
  return t.replace(/\/+$/, '').toLowerCase().endsWith('/api/v2');
}

/** Browser-only: logs once when audience is misconfigured. */
export function warnIfStaffAuth0AudienceUnsupported(audience: string | undefined): void {
  if (typeof window === 'undefined' || !isLikelyAuth0ManagementApiAudience(audience)) return;
  console.error(
    '[admin-ui] ADMIN_UI_AUTH0_AUDIENCE points at the Auth0 Management API (/api/v2). Use your **custom API** Identifier (the same value as AUTH0_AUDIENCE on admin-ui-api), not the Management API. Wrong audience commonly causes a blank page on refresh and HTTP 400 on silent /authorize.',
  );
}
