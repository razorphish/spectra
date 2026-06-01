import {
  staffHasPermission,
  staffPermissionSet,
  STAFF_PERMISSION_INTEGRATIONS_EXPORT,
  STAFF_PERMISSION_INTEGRATIONS_READ,
} from './staff-permissions';

describe('staff-permissions', () => {
  it('collects permissions array', () => {
    const s = staffPermissionSet({
      permissions: ['platform:integrations:read', 'other'],
    });
    expect(s.has(STAFF_PERMISSION_INTEGRATIONS_READ)).toBe(true);
    expect(s.has(STAFF_PERMISSION_INTEGRATIONS_EXPORT)).toBe(false);
  });

  it('collects scope string', () => {
    expect(
      staffHasPermission({ scope: 'openid profile platform:integrations:export' }, STAFF_PERMISSION_INTEGRATIONS_EXPORT),
    ).toBe(true);
  });

  it('staffHasPermission false when missing', () => {
    expect(staffHasPermission({ permissions: [] }, STAFF_PERMISSION_INTEGRATIONS_READ)).toBe(false);
  });
});
