import 'express-serve-static-core';

/** Align with `@spectra/auth` `express.d.ts` so admin-ui-api sees `req.auth` after Auth0 middleware. */
declare module 'express-serve-static-core' {
  interface Request {
    auth?: {
      sub: string;
      claims?: Record<string, unknown>;
    };
    auth0AccessToken?: string;
  }
}
