import 'express-serve-static-core';

declare module 'express-serve-static-core' {
  interface Request {
    /** Set by Auth0 access-token middleware after successful Bearer validation. */
    auth?: {
      sub: string;
      claims: Record<string, unknown>;
    };
    /** Raw Bearer token; set with `auth` for optional downstream use. */
    auth0AccessToken?: string;
  }
}
