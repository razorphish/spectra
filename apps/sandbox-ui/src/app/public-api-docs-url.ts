/**
 * Public limited OpenAPI (Swagger UI) — same contract as `GET /openapi.json` on aviate-api.
 * Never use `/integration/docs` (staff/authenticated full catalog) for sandbox links.
 */
export function buildPublicApiSwaggerUrl(
  apiBaseUrl: string,
  publicApiDocsBaseUrl?: string,
): string {
  const base = (publicApiDocsBaseUrl?.trim() || apiBaseUrl).replace(/\/$/, '');
  return `${base}/docs`;
}
