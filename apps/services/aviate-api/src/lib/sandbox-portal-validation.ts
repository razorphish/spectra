const URI_RE = /^https?:\/\/.+/i;

export function validateRedirectUri(raw: string): string | null {
  const u = raw.trim();
  if (!u) return 'Redirect URI cannot be empty.';
  if (!URI_RE.test(u)) return 'Redirect URI must start with http:// or https://.';
  if (u.includes('#')) return 'Redirect URI must not contain a fragment (#).';
  if (u.includes('?')) return 'Redirect URI must not contain a query string (?).';
  try {
    // eslint-disable-next-line no-new
    new URL(u);
  } catch {
    return 'Redirect URI must be a valid URL.';
  }
  return null;
}

export function normalizeApplicationName(name: string): string {
  return name.trim();
}
