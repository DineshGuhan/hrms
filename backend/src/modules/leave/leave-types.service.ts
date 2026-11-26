import { ApiError } from '../../middleware/errorHandler.js';
import type { AuthUser } from '../../middleware/auth.js';
import * as repo from './leave-types.repository.js';
import type { CreateLeaveTypeInput, UpdateLeaveTypeInput } from './leave-types.schema.js';

const NOT_FOUND = new ApiError(404, 'Leave type not found', 'LEAVE_TYPE_NOT_FOUND');

/** HR/Admin only for all mutations (FR-LEV-01). */
function requireManager(viewer: AuthUser): void {
  if (!viewer) throw new ApiError(401, 'Not authenticated', 'UNAUTHORIZED');
  if (!viewer.roles.some((r) => r === 'admin' || r === 'hr')) {
    throw new ApiError(403, 'Only HR or Admin can manage leave types', 'FORBIDDEN');
  }
}

export async function createLeaveType(input: CreateLeaveTypeInput, viewer: AuthUser) {
  requireManager(viewer);
  if (await repo.leaveTypeNameExists(input.name)) {
    throw new ApiError(409, 'A leave type with this name already exists', 'NAME_TAKEN');
  }
  return repo.insertLeaveType(input.name, input.quota_days, input.is_paid);
}

export async function listLeaveTypes(viewer: AuthUser) {
  if (!viewer) throw new ApiError(401, 'Not authenticated', 'UNAUTHORIZED');
  const year = new Date().getFullYear();
  const rows = await repo.listLeaveTypesWithUsage(year);
  // HR/Admin see everything (including archived); other roles only active types.
  const isManager = viewer.roles.some((r) => r === 'admin' || r === 'hr');
  return isManager ? rows : rows.filter((t) => t.is_active);
}

export async function updateLeaveType(id: string, input: UpdateLeaveTypeInput, viewer: AuthUser) {
  requireManager(viewer);
  const existing = await repo.findLeaveTypeById(id);
  if (!existing) throw NOT_FOUND;
  if (input.name !== undefined && input.name !== existing.name && (await repo.leaveTypeNameExists(input.name))) {
    throw new ApiError(409, 'A leave type with this name already exists', 'NAME_TAKEN');
  }
  const updated = await repo.updateLeaveTypeFields(id, input);
  if (!updated) throw NOT_FOUND;
  return updated;
}

/** Archive = is_active false. Archived types stay out of new-request selects. */
export async function archiveLeaveType(id: string, viewer: AuthUser) {
  requireManager(viewer);
  const updated = await repo.setLeaveTypeActive(id, false);
  if (!updated) throw NOT_FOUND;
  return updated;
}
