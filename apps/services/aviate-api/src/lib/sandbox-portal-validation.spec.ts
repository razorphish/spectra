import { validateRedirectUri } from './sandbox-portal-validation';

describe('validateRedirectUri', () => {
  it('accepts valid https URL', () => {
    expect(validateRedirectUri('https://app.example/callback')).toBeNull();
  });
  it('rejects fragment', () => {
    expect(validateRedirectUri('https://a.com/cb#x')).not.toBeNull();
  });
  it('rejects query', () => {
    expect(validateRedirectUri('https://a.com/cb?x=1')).not.toBeNull();
  });
});
