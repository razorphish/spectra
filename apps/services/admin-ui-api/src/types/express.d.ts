import 'express-serve-static-core';

declare module 'express-serve-static-core' {
  interface Request {
    /** Set by Auth0 access-token middleware after successful Bearer validation. */
    auth?: {
      sub: string;
      claims: Record<string, unknown>;
    };
    /** Raw Bearer token; set with `auth` for optional Userinfo fallback (e.g. me/sync). */
    auth0AccessToken?: string;
  }
}
