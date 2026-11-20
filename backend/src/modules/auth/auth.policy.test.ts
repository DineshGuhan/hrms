import { hasAnyRole, canManageUsers } from './auth.policy.js';

describe('auth policy (BRD §3)', () => {
  it('hasAnyRole matches when the user holds one of the allowed roles', () => {
    expect(hasAnyRole(['employee'], ['employee', 'hr'])).toBe(true);
    expect(hasAnyRole(['hr', 'manager'], ['admin'])).toBe(false);
  });

  it('hasAnyRole is false for an empty role list', () => {
    expect(hasAnyRole([], ['employee'])).toBe(false);
  });

  it('canManageUsers is admin-only', () => {
    expect(canManageUsers(['admin'])).toBe(true);
    expect(canManageUsers(['hr', 'manager', 'employee'])).toBe(false);
    expect(canManageUsers([])).toBe(false);
  });
});
