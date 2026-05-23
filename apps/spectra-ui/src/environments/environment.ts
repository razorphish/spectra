export const environment = {
  production: true,
  /** Empty when the SPA is served behind the same origin as the API (reverse proxy). */
  apiBaseUrl: '',
  /**
   * Absolute URL of the sandbox Angular app. Empty hides the header/footer Sandbox link
   * until set via deploy-time file replacement or same pattern as apiBaseUrl.
   */
  sandboxUiUrl: '',
};
