export type Role = 'admin' | 'hr' | 'manager' | 'employee';

/** Central access policy (BRD §3). Services call these; controllers never decide access. */
export function hasAnyRole(userRoles: readonly Role[], allowed: readonly Role[]): boolean {
  return allowed.some((role) => userRoles.includes(role));
}

export function canManageUsers(userRoles: readonly Role[]): boolean {
  return hasAnyRole(userRoles, ['admin']);
}
