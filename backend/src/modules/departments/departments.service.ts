import { ApiError } from '../../middleware/errorHandler.js';
import type { AuthUser } from '../../middleware/auth.js';
import * as repo from './departments.repository.js';
import type { AssignHeadInput, CreateDepartmentInput, UpdateDepartmentInput } from './departments.schema.js';

const NOT_FOUND = new ApiError(404, 'Department not found', 'DEPARTMENT_NOT_FOUND');

function requireManager(viewer: AuthUser): void {
  if (!viewer) throw new ApiError(401, 'Not authenticated', 'UNAUTHORIZED');
  if (!viewer.roles.some((r) => r === 'admin' || r === 'hr')) {
    throw new ApiError(403, 'Only HR or Admin can manage departments', 'FORBIDDEN');
  }
}

export async function createDepartment(input: CreateDepartmentInput, viewer: AuthUser) {
  requireManager(viewer);
  if (await repo.nameExists(input.name)) {
    throw new ApiError(409, 'A department with this name already exists', 'NAME_TAKEN');
  }
  return repo.insertDepartment(input.name, input.description ?? null);
}

export async function getDepartment(id: string, viewer: AuthUser) {
  if (!viewer) throw new ApiError(401, 'Not authenticated', 'UNAUTHORIZED');
  const row = await repo.findDepartmentById(id);
  if (!row) throw NOT_FOUND;
  return row;
}

/**
 * HR/Admin: full list with employee counts and status.
 * Other roles: active-only lightweight list (for selects).
 */
export async function listDepartments(viewer: AuthUser) {
  if (!viewer) throw new ApiError(401, 'Not authenticated', 'UNAUTHORIZED');
  const isManager = viewer.roles.some((r) => r === 'admin' || r === 'hr');
  const all = await repo.listDepartments();
  if (isManager) return all;
  return all
    .filter((d) => d.status === 'active')
    .map((d) => ({ id: d.id, name: d.name, employee_count: d.employee_count }));
}

export async function updateDepartment(id: string, input: UpdateDepartmentInput, viewer: AuthUser) {
  requireManager(viewer);
  const existing = await repo.findDepartmentById(id);
  if (!existing) throw NOT_FOUND;
  if (input.name !== undefined && input.name !== existing.name && (await repo.nameExists(input.name))) {
    throw new ApiError(409, 'A department with this name already exists', 'NAME_TAKEN');
  }
  const updated = await repo.updateDepartmentFields(id, input);
  if (!updated) throw NOT_FOUND;
  return updated;
}

export async function assignHead(id: string, input: AssignHeadInput, viewer: AuthUser) {
  requireManager(viewer);
  const department = await repo.findDepartmentById(id);
  if (!department) throw NOT_FOUND;
  const candidate = await repo.findEmployeeHeadCandidate(input.employee_id);
  if (!candidate) {
    throw new ApiError(404, 'Employee not found', 'EMPLOYEE_NOT_FOUND');
  }
  if (candidate.status !== 'active') {
    throw new ApiError(400, 'Department head must be an active employee', 'INVALID_HEAD');
  }
  const updated = await repo.setDepartmentHead(id, input.employee_id);
  if (!updated) throw NOT_FOUND;
  return updated;
}

export async function archiveDepartment(id: string, viewer: AuthUser) {
  requireManager(viewer);
  const updated = await repo.setDepartmentStatus(id, 'archived');
  if (!updated) throw NOT_FOUND;
  return updated;
}
