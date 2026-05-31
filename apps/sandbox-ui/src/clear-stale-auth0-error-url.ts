/**
 * Auth0 failed redirects use ?error=...&error_description=...&state=... (no `code`).
 * @auth0/auth0-angular still treats that as a callback; leaving the query on `/` breaks repeat logins.
 * Persist a short message for the UI, then strip the query before Angular bootstraps.
 */
export function persistAuth0ErrorQueryAndStrip(): void {
  if (typeof window === 'undefined') return;
  try {
    const sp = new URLSearchParams(window.location.search);
    const hasState = sp.has('state');
    const hasError = sp.has('error');
    const hasCode = sp.has('code') || sp.has('connect_code');
    if (!hasState || !hasError || hasCode) return;

    const error = sp.get('error') ?? 'unknown_error';
    const rawDesc = sp.get('error_description') ?? '';
    let error_description = rawDesc;
    try {
      error_description = decodeURIComponent(rawDesc.replace(/\+/g, ' '));
    } catch {
      error_description = rawDesc;
    }
    sessionStorage.setItem(
      'spectra_sandbox_oauth_error',
      JSON.stringify({ error, error_description, t: Date.now() }),
    );
    const path = `${window.location.pathname}${window.location.hash || ''}`;
    window.history.replaceState(null, '', path);
  } catch {
    /* ignore */
  }
}

/** Run when this module is the first import in `main.ts` so the URL is cleaned before Angular reads `location`. */
persistAuth0ErrorQueryAndStrip();
