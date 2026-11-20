import { canViewSensitive, canManageEmployees } from './employees.policy.js';

const hrViewer = { id: 'hr-1', roles: ['hr' as const] };
const adminViewer = { id: 'ad-1', roles: ['admin' as const] };
const mgrViewer = { id: 'mg-1', roles: ['manager' as const] };
const empViewer = { id: 'em-1', roles: ['employee' as const] };

describe('employees policy (BRD §3, FR-EMP-04)', () => {
  it('self can view own sensitive fields', () => {
    expect(canViewSensitive('em-1', empViewer.roles, 'em-1')).toBe(true);
  });

  it('HR and admin can view any employee’s sensitive fields', () => {
    expect(canViewSensitive('hr-1', hrViewer.roles, 'someone-else')).toBe(true);
    expect(canViewSensitive('ad-1', adminViewer.roles, 'someone-else')).toBe(true);
  });

  it('manager and other employees cannot view sensitive fields', () => {
    expect(canViewSensitive('mg-1', mgrViewer.roles, 'someone-else')).toBe(false);
    expect(canViewSensitive('em-1', empViewer.roles, 'someone-else')).toBe(false);
  });

  it('only HR and admin can manage employees', () => {
    expect(canManageEmployees(hrViewer.roles)).toBe(true);
    expect(canManageEmployees(adminViewer.roles)).toBe(true);
    expect(canManageEmployees(mgrViewer.roles)).toBe(false);
    expect(canManageEmployees(empViewer.roles)).toBe(false);
  });
});
