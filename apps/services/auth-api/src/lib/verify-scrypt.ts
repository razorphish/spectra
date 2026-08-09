import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';

const SCRYPT_SALT_LEN = 16;
const SCRYPT_KEY_LEN = 32;

export function verifyClientSecret(secret: string, stored: string): boolean {
  const parts = stored.split('$');
  if (parts.length !== 3 || parts[0] !== 'scrypt') return false;
  const saltHex = parts[1];
  const hashHex = parts[2];
  if (!saltHex || !hashHex) return false;
  try {
    const salt = Buffer.from(saltHex, 'hex');
    const expected = Buffer.from(hashHex, 'hex');
    if (salt.length !== SCRYPT_SALT_LEN || expected.length !== SCRYPT_KEY_LEN) return false;
    const derived = scryptSync(secret, salt, SCRYPT_KEY_LEN);
    return timingSafeEqual(derived, expected);
  } catch {
    return false;
  }
}
