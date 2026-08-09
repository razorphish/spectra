/**
 * Runnable self-check for the BFF crypto (no Auth0 needed):
 *   npx tsx apps/local-edge/src/bff.selfcheck.ts
 * Asserts PKCE S256 determinism and JWE session encrypt/decrypt roundtrip.
 */
import assert from 'node:assert';
import { createHash } from 'node:crypto';
import type { Request } from 'express';
import { pkceChallenge, encryptSession, decryptSession, checkCsrf } from './bff';

// Minimal BffConfig for CSRF checks (only origin is read by checkCsrf).
const CSRF_CFG = { origin: 'https://app.example.com' } as unknown as Parameters<typeof checkCsrf>[1];

function fakeReq(method: string, headers: Record<string, string>): Request {
  return { method, headers } as unknown as Request;
}

async function main(): Promise<void> {
  // PKCE: challenge is deterministic base64url SHA-256 of the verifier.
  const verifier = 'test-verifier-abc123';
  const expected = createHash('sha256').update(verifier).digest().toString('base64url');
  assert.strictEqual(pkceChallenge(verifier), expected, 'pkceChallenge must be S256 base64url');
  assert.ok(!/[+/=]/.test(pkceChallenge(verifier)), 'challenge must be URL-safe (no +/=)');

  // Session cookie: encrypt → decrypt returns the same claims.
  const key = createHash('sha256').update('unit-test-secret').digest();
  const claims = { sub: 'auth0|1', email: 'a@b.com', name: 'A B', at: 'ACCESS', rt: 'REFRESH', ax: 123 };
  const token = await encryptSession(claims, key);
  const back = await decryptSession(token, key);
  assert.ok(back, 'decrypt must succeed with the right key');
  assert.strictEqual(back!.sub, claims.sub);
  assert.strictEqual(back!.at, claims.at);
  assert.strictEqual(back!.ax, claims.ax);

  // Wrong key must fail closed (null, not throw).
  const wrong = createHash('sha256').update('other-secret').digest();
  assert.strictEqual(await decryptSession(token, wrong), null, 'wrong key must return null');

  // CSRF: safe methods always pass, even with no origin/token.
  assert.strictEqual(checkCsrf(fakeReq('GET', {}), CSRF_CFG), true, 'GET must pass CSRF');

  // Unsafe method with matching origin + matching double-submit token passes.
  const good = fakeReq('POST', {
    origin: 'https://app.example.com',
    'x-csrf-token': 'tok123',
    cookie: 'bff_csrf=tok123',
  });
  assert.strictEqual(checkCsrf(good, CSRF_CFG), true, 'matching origin + token must pass');

  // Cross-site origin fails even if it somehow supplies a token.
  const badOrigin = fakeReq('POST', {
    origin: 'https://evil.example.com',
    'x-csrf-token': 'tok123',
    cookie: 'bff_csrf=tok123',
  });
  assert.strictEqual(checkCsrf(badOrigin, CSRF_CFG), false, 'cross-site origin must fail');

  // Header/cookie mismatch fails (double-submit).
  const badToken = fakeReq('POST', {
    origin: 'https://app.example.com',
    'x-csrf-token': 'attacker',
    cookie: 'bff_csrf=tok123',
  });
  assert.strictEqual(checkCsrf(badToken, CSRF_CFG), false, 'token mismatch must fail');

  // Missing token/cookie fails.
  const noToken = fakeReq('POST', { origin: 'https://app.example.com' });
  assert.strictEqual(checkCsrf(noToken, CSRF_CFG), false, 'missing token must fail');

  console.log('bff.selfcheck: OK');
}

main().catch((e) => {
  console.error('bff.selfcheck: FAIL', e);
  process.exit(1);
});
