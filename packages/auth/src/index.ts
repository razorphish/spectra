export {
  createRequireAuth0AccessToken,
  type Auth0AccessTokenMiddlewareOptions,
} from './lib/require-auth0-access-token';
export {
  createRequireSpectraAccessToken,
  type SpectraAccessTokenMiddlewareOptions,
  type M2mPrincipal,
} from './lib/require-spectra-access-token';
export {
  scopePathRules,
  scopesAllowRequest,
  requiredScopeForRequest,
  exportScopeMapForContract,
  KNOWN_M2M_SCOPES,
  isKnownM2mScope,
  SCOPE_MAP_VERSION,
} from './lib/scope-map';
export { SPECTRA_M2M_ISSUER_DEFAULT, SPECTRA_M2M_AUDIENCE_DEFAULT } from './lib/m2m-constants';
