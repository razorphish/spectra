/**
 * Single-part PUT cap (matches plan: 1 GiB until multipart ships). The
 * surrounding API also clamps `expiresInSeconds` so URLs can't outlive a
 * sensible window.
 */
export const DEFAULT_MAX_BYTES = 1024 * 1024 * 1024; // 1 GiB

export const DEFAULT_PRESIGN_EXPIRY_SECONDS = 15 * 60; // 15 minutes
export const MAX_PRESIGN_EXPIRY_SECONDS = 60 * 60; // 1 hour ceiling

/** Throws when the client-declared size exceeds the configured ceiling. */
export function assertWithinSizeLimit(
  bytesExpected: number,
  maxBytes: number = DEFAULT_MAX_BYTES
): void {
  if (!Number.isFinite(bytesExpected) || bytesExpected <= 0) {
    throw new Error('bytesExpected must be a positive number');
  }
  if (bytesExpected > maxBytes) {
    throw new Error(
      `bytesExpected (${bytesExpected}) exceeds maxBytes (${maxBytes})`
    );
  }
}

export function clampExpirySeconds(
  expiresInSeconds: number = DEFAULT_PRESIGN_EXPIRY_SECONDS
): number {
  if (!Number.isFinite(expiresInSeconds) || expiresInSeconds <= 0) {
    return DEFAULT_PRESIGN_EXPIRY_SECONDS;
  }
  return Math.min(expiresInSeconds, MAX_PRESIGN_EXPIRY_SECONDS);
}
