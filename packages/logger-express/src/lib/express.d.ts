import 'express-serve-static-core';

declare module 'express-serve-static-core' {
  interface Request {
    /** Optional; set by Auth0 / Spectra access-token middleware when present. */
    auth?: {
      type?: 'user' | 'm2m';
      sub: string;
      claims?: Record<string, unknown>;
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
  }
}
