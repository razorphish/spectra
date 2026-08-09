/**
 * Staff-controlled visibility for legacy sandbox **applications** (OAuth app registrations)
 * in the developer portal (sandbox-ui). M2M integrations are separate and unaffected.
 *
 * Stored in `spectra.platform_settings` as JSON `{ "enabled": boolean }`.
 */
export const PLATFORM_DEVELOPER_APPLICATIONS_UI_KEY = 'sandbox_portal.developer_applications_ui_enabled' as const;

export function parseDeveloperApplicationsUiEnabled(value: unknown): boolean {
  if (value && typeof value === 'object' && 'enabled' in value) {
    return (value as { enabled?: unknown }).enabled === true;
  }
  return false;
}
