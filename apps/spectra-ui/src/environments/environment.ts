export const environment = {
  production: true,
  /** Empty when the SPA is served behind the same origin as the API (reverse proxy). */
  apiBaseUrl: '',
  /** Public auth-api origin for OAuth 2.0 Authorization Server metadata links in docs. */
  authApiPublicBaseUrl: '',
  /**
   * Absolute URL of the sandbox Angular app. Empty hides the header/footer Sandbox link
   * until set via deploy-time file replacement or same pattern as apiBaseUrl.
   */
  sandboxUiUrl: '',
};
