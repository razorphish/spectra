import 'express-serve-static-core';

declare module 'express-serve-static-core' {
  interface Request {
    /** Set by Auth0 / Spectra access-token middleware after successful Bearer validation. */
    auth?: {
      type?: 'user' | 'm2m';
      sub: string;
      claims?: Record<string, unknown>;
      /** Populated for M2M tokens (`createRequireSpectraAccessToken`). */
      m2m?: {
        type: 'm2m';
        id: string;
        client_id: string;
        org_id: string;
        display_name: string;
        scopes: string[];
        issuer: string;
        issued_at: string;
        expires_at: string;
        token_id: string;
      };
    };
    /** Raw Bearer token; set with `auth` for optional downstream use. */
    auth0AccessToken?: string;
  }
}
