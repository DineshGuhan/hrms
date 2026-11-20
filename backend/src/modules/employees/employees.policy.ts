import type { Role } from '../auth/auth.policy.js';

/**
 * Field-level access rules for employee records (BRD §3, FR-EMP-04).
 * Centralized here so services never inline these decisions.
 */

const SENSITIVE_ROLES: Role[] = ['admin', 'hr'];
const MANAGEMENT_ROLES: Role[] = ['admin', 'hr'];

/** True when the caller may see salary/bank/national-ID fields. */
export function canViewSensitive(viewerId: string, viewerRoles: Role[], employeeUserId: string): boolean {
  if (viewerId === employeeUserId) return true; // self
  return SENSITIVE_ROLES.some((r) => viewerRoles.includes(r));
}

/** True when the caller may create, fully edit, or deactivate employees. */
export function canManageEmployees(viewerRoles: Role[]): boolean {
  return MANAGEMENT_ROLES.some((r) => viewerRoles.includes(r));
}

/** Which fields a role-scoped list/detail response may carry. */
export function listableFields(): string[] {
  return ['id', 'first_name', 'last_name', 'email', 'phone', 'job_title', 'department_id', 'manager_id', 'join_date', 'employment_status'];
}
