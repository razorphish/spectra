import { users, orgs } from './database';

describe('@spectra/database', () => {
  it('exports control-plane schema symbols', () => {
    expect(users).toBeDefined();
    expect(orgs).toBeDefined();
  });
});
