/**
 * When the access token has no email claims, Auth0 still allows calling `/userinfo`
 * with an RS256 access token issued for a custom API (see Auth0 "Access Tokens" docs).
 * Requires `openid` (and typically `email`) scope on login — @auth0/auth0-spa-js defaults
 * include `openid profile email`.
 */
export async function fetchStaffEmailFromAuth0Userinfo(
  auth0Domain: string,
  bearerAccessToken: string,
  expectedSub: string,
): Promise<string | undefined> {
  const host = auth0Domain.replace(/^https?:\/\//, '').replace(/\/$/, '');
  const url = `https://${host}/userinfo`;
  try {
    const res = await fetch(url, {
      method: 'GET',
      headers: { Authorization: `Bearer ${bearerAccessToken}` },
    });
    if (!res.ok) return undefined;
    const data = (await res.json()) as Record<string, unknown>;
    const tokenSub =
      typeof data['sub'] === 'string' ? (data['sub'] as string).trim() : '';
    const legacy =
      typeof data['user_id'] === 'string' ? (data['user_id'] as string).trim() : '';
    const profileSub = tokenSub || legacy;
    if (profileSub && profileSub !== expectedSub) {
      return undefined;
    }
    const email = data['email'];
    return typeof email === 'string' && email.trim() ? email.trim() : undefined;
  } catch {
    return undefined;
  }
}
