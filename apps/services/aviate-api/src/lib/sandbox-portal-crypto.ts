import { randomBytes, scryptSync } from 'node:crypto';

const SCRYPT_SALT_LEN = 16;
const SCRYPT_KEY_LEN = 32;

export function generateClientId(): string {
  return `spectra_${randomBytes(16).toString('hex')}`;
}

export function generateClientSecret(): string {
  return randomBytes(32).toString('base64url');
}

/** One-way store for OAuth client secrets (never log plaintext). */
export function hashClientSecret(secret: string): string {
  const salt = randomBytes(SCRYPT_SALT_LEN);
  const hash = scryptSync(secret, salt, SCRYPT_KEY_LEN);
  return `scrypt$${salt.toString('hex')}$${hash.toString('hex')}`;
}
