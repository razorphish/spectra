/**
 * Namespaced email claim added by Auth0 Action (Post Login) on the API access token.
 * @see apps/admin-ui/docs/auth0.md — "Access token email claim (staff sync)"
 */
export const SPECTRA_ACCESS_TOKEN_EMAIL_CLAIM = 'https://spectra.inc/admin/email';

export function staffEmailFromAccessTokenClaims(
  claims: Record<string, unknown>,
): string | undefined {
  const fromCustom = claims[SPECTRA_ACCESS_TOKEN_EMAIL_CLAIM];
  if (typeof fromCustom === 'string' && fromCustom.trim()) {
    return fromCustom.trim();
  }
  const top = claims['email'];
  if (typeof top === 'string' && top.trim()) {
    return top.trim();
  }
  return undefined;
}
