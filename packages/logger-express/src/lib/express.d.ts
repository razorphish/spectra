import 'express-serve-static-core';

declare module 'express-serve-static-core' {
  interface Request {
    /** Optional; set by Auth0 middleware when present. */
    auth?: {
      sub: string;
      claims?: Record<string, unknown>;
    };
  }
}
