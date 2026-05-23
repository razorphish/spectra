/** Cleared on logout so the next login re-runs `POST /v1/admin/me/sync`. */
export const STAFF_PROFILE_SYNCED_SESSION_KEY = 'spectra_staff_profile_synced_v1';

export function staffMeSyncUrl(apiBaseUrl: string): string {
  return `${apiBaseUrl.replace(/\/$/, '')}/v1/admin/me/sync`;
}
