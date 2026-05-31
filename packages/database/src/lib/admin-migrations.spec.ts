import * as adminMigrations from './admin-migrations';
import type { SpectraDb } from './connection';

describe('deleteMigrationRecordByHash', () => {
  it('rejects non-hex hash without executing SQL', async () => {
    const execute = jest.fn();
    const db = { execute } as unknown as SpectraDb;
    await expect(adminMigrations.deleteMigrationRecordByHash(db, 'not-a-valid-hash')).rejects.toThrow(
      'Invalid migration hash',
    );
    expect(execute).not.toHaveBeenCalled();
  });
});
