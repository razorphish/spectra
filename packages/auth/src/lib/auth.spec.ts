import { createRequireAuth0AccessToken } from './require-auth0-access-token';

describe('createRequireAuth0AccessToken', () => {
  it('returns 503 handler when auth env is missing', async () => {
    const prevDomain = process.env['AUTH0_DOMAIN'];
    const prevAudience = process.env['AUTH0_AUDIENCE'];
    const prevDisabled = process.env['AUTH0_VERIFY_DISABLED'];
    delete process.env['AUTH0_DOMAIN'];
    delete process.env['AUTH0_AUDIENCE'];
    delete process.env['AUTH0_VERIFY_DISABLED'];

    const handler = createRequireAuth0AccessToken({ logLabel: 'test' });
    const req = { headers: {} } as Parameters<typeof handler>[0];
    const res = {
      statusCode: 0,
      body: undefined as unknown,
      status(code: number) {
        this.statusCode = code;
        return this;
      },
      json(payload: unknown) {
        this.body = payload;
        return this;
      },
    };
    await handler(req, res as unknown as Parameters<typeof handler>[1], () => undefined);

    expect(res.statusCode).toBe(503);

    if (prevDomain !== undefined) process.env['AUTH0_DOMAIN'] = prevDomain;
    if (prevAudience !== undefined) process.env['AUTH0_AUDIENCE'] = prevAudience;
    if (prevDisabled !== undefined) {
      process.env['AUTH0_VERIFY_DISABLED'] = prevDisabled;
    }
  });
});
