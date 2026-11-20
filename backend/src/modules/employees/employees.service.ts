import { withTransaction } from '../../config/db.js';
import { ApiError } from '../../middleware/errorHandler.js';
import type { AuthUser } from '../../middleware/auth.js';
import { canManageEmployees, canViewSensitive } from './employees.policy.js';
import { decryptFields, encryptFields } from './employees.crypto.js';
import * as repo from './employees.repository.js';
import type { AdminUpdateInput, CreateEmployeeInput, ListQuery, SelfUpdateInput } from './employees.schema.js';

const NOT_FOUND = new ApiError(404, 'Employee not found', 'EMPLOYEE_NOT_FOUND');

function requireViewer(reqUser: AuthUser): AuthUser {
  if (!reqUser) throw new ApiError(401, 'Not authenticated', 'UNAUTHORIZED');
  return reqUser;
}

/** Shape a row for the caller: sensitive fields only when permitted (FR-EMP-04). */
function toDetail(row: repo.EmployeeRow, viewer: AuthUser) {
  const base = {
    id: row.id,
    user_id: row.user_id,
    first_name: row.first_name,
    last_name: row.last_name,
    email: row.email,
    phone: row.phone,
    address: row.address,
    job_title: row.job_title,
    department_id: row.department_id,
    manager_id: row.manager_id,
    date_of_birth: row.date_of_birth,
    join_date: row.join_date,
    status: row.employment_status,
  };
  if (!canViewSensitive(viewer.id, viewer.roles, row.user_id ?? '')) return base;
  return { ...base, ...decryptFields(row) };
}

export async function createEmployee(input: CreateEmployeeInput, viewer: AuthUser) {
  requireViewer(viewer);
  if (!canManageEmployees(viewer.roles)) {
    throw new ApiError(403, 'Only HR or Admin can create employees', 'FORBIDDEN');
  }
  if (await repo.emailExists(input.email)) {
    throw new ApiError(409, 'An employee with this email already exists', 'EMAIL_TAKEN');
  }
  const encrypted = encryptFields(input);
  const row = await withTransaction((client) => repo.insertEmployee({ ...input, ...encrypted }, client));
  return toDetail(row, viewer);
}

export async function getEmployee(id: string, viewer: AuthUser) {
  requireViewer(viewer);
  const row = await repo.findEmployeeById(id);
  if (!row) throw NOT_FOUND;
  return toDetail(row, viewer);
}

export async function listEmployees(query: ListQuery, viewer: AuthUser) {
  requireViewer(viewer);
  const selfRow = await repo.findEmployeeByUserId(viewer.id);
  const scope: { managerId?: string; selfEmployeeId?: string } = {};
  if (viewer.roles.includes('admin') || viewer.roles.includes('hr')) {
    // unrestricted
  } else if (viewer.roles.includes('manager') && selfRow) {
    scope.managerId = selfRow.id;
  } else if (selfRow) {
    scope.selfEmployeeId = selfRow.id;
  } else {
    // A user with no employee record and no elevated role sees nothing.
    return { data: [], meta: { page: query.page, limit: query.limit, total: 0, totalPages: 0 } };
  }
  const filters = {
    search: query.search,
    department: query.department,
    status: query.status,
    limit: query.limit,
    offset: (query.page - 1) * query.limit,
  };
  const [rows, total] = await Promise.all([
    repo.listEmployees(filters, scope),
    repo.countEmployees(filters),
  ]);
  return {
    // List responses never carry sensitive fields (FR-EMP-04).
    data: rows.map((r) => ({
      id: r.id,
      first_name: r.first_name,
      last_name: r.last_name,
      email: r.email,
      phone: r.phone,
      job_title: r.job_title,
      department_id: r.department_id,
      manager_id: r.manager_id,
      join_date: r.join_date,
      status: r.employment_status,
    })),
    meta: {
      page: query.page,
      limit: query.limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / query.limit)),
    },
  };
}

export async function updateEmployee(id: string, input: AdminUpdateInput | SelfUpdateInput, viewer: AuthUser) {
  requireViewer(viewer);
  const row = await repo.findEmployeeById(id);
  if (!row) throw NOT_FOUND;

  const managing = canManageEmployees(viewer.roles);
  const self = viewer.id === row.user_id;
  if (!managing && !self) {
    throw new ApiError(403, 'You cannot update this employee', 'FORBIDDEN');
  }

  if (managing) {
    const { salary, bank_account, bank_name, national_id, ...plain } = input as AdminUpdateInput;
    const hasSensitive = [salary, bank_account, bank_name, national_id].some((v) => v !== undefined);
    const encrypted = hasSensitive ? encryptFields({ salary, bank_account, bank_name, national_id }) : undefined;
    const updated = await repo.updateEmployeeFields(id, plain, encrypted);
    if (!updated) throw NOT_FOUND;
    return toDetail(updated, viewer);
  }

  // Self-service: contact fields only (FR-EMP-06).
  const selfInput = input as SelfUpdateInput;
  const allowed: Record<string, unknown> = {};
  if (selfInput.phone !== undefined) allowed.phone = selfInput.phone;
  if (selfInput.address !== undefined) allowed.address = selfInput.address;
  const updated = await repo.updateEmployeeFields(id, allowed);
  if (!updated) throw NOT_FOUND;
  return toDetail(updated, viewer);
}

export async function setEmployeeStatus(id: string, status: 'active' | 'inactive', viewer: AuthUser) {
  requireViewer(viewer);
  if (!canManageEmployees(viewer.roles)) {
    throw new ApiError(403, 'Only HR or Admin can change employee status', 'FORBIDDEN');
  }
  const row = await repo.findEmployeeById(id);
  if (!row) throw NOT_FOUND;
  const updated = await repo.setEmployeeStatus(id, status);
  if (!updated) throw NOT_FOUND;
  return toDetail(updated, viewer);
}
