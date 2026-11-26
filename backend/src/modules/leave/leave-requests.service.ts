import { withTransaction } from '../../config/db.js';
import { ApiError } from '../../middleware/errorHandler.js';
import type { AuthUser } from '../../middleware/auth.js';
import * as repo from './leave-requests.repository.js';
import * as leaveTypesRepo from './leave-types.repository.js';

export interface WorkingDaysResult {
  workingDays: number;
  weekends: number;
}

/** Count working days (Mon-Fri) in the inclusive date range. */
export function countWorkingDays(startDate: string, endDate: string): WorkingDaysResult {
  const start = new Date(`${startDate}T00:00:00Z`);
  const end = new Date(`${endDate}T00:00:00Z`);
  let workingDays = 0;
  let weekends = 0;
  for (const d = new Date(start); d <= end; d.setUTCDate(d.getUTCDate() + 1)) {
    const day = d.getUTCDay();
    if (day === 0 || day === 6) weekends++;
    else workingDays++;
  }
  return { workingDays, weekends };
}

function ensureNotPast(startDate: string): void {
  const today = new Date();
  const todayStr = today.toISOString().slice(0, 10);
  if (startDate < todayStr) {
    throw new ApiError(422, 'Start date cannot be in the past', 'PAST_START_DATE');
  }
}

export async function createLeaveRequest(
  input: { leave_type_id: string; start_date: string; end_date: string; reason: string },
  viewer: AuthUser,
) {
  if (!viewer) throw new ApiError(401, 'Not authenticated', 'UNAUTHORIZED');
  ensureNotPast(input.start_date);

  // Resolve the caller's employee record.
  const selfId = await repo.findEmployeeIdByUserId(viewer.id);
  if (!selfId) throw new ApiError(404, 'No employee record for this user', 'EMPLOYEE_NOT_FOUND');

  const type = await leaveTypesRepo.findLeaveTypeById(input.leave_type_id);
  if (!type || !type.is_active) {
    throw new ApiError(422, 'Leave type is not available', 'INVALID_LEAVE_TYPE');
  }

  const { workingDays } = countWorkingDays(input.start_date, input.end_date);
  if (workingDays <= 0) {
    throw new ApiError(422, 'The selected range contains no working days', 'NO_WORKING_DAYS');
  }

  // Overlap check (pending/approved) and insert — inside the same transaction
  // so a concurrent request cannot slip an overlap past the check.
  return withTransaction(async (client) => {
    const overlapping = await repo.findOverlappingRequest(selfId, input.start_date, input.end_date);
    if (overlapping) {
      throw new ApiError(409, 'You already have a request overlapping these dates', 'OVERLAP');
    }

    // Balance check for paid types (unpaid skips).
    const balances = await repo.getLeaveBalances(selfId, new Date().getFullYear());
    const balance = balances.find((b) => b.leave_type_id === input.leave_type_id);
    const remaining = Number(balance?.quota_days ?? 0) - Number(balance?.used_days ?? 0);
    if (type.is_paid && workingDays > remaining) {
      throw new ApiError(422, `Insufficient balance: ${remaining} day(s) remaining`, 'INSUFFICIENT_BALANCE');
    }

    const created = await repo.insertLeaveRequest(
      {
        employee_id: selfId,
        leave_type_id: input.leave_type_id,
        start_date: input.start_date,
        end_date: input.end_date,
        days: workingDays,
        reason: input.reason,
      },
      client,
    );
    return { ...created, leave_type_name: type.name };
  });
}

export async function listMyLeaveRequests(viewer: AuthUser) {
  if (!viewer) throw new ApiError(401, 'Not authenticated', 'UNAUTHORIZED');
  const selfId = await repo.findEmployeeIdByUserId(viewer.id);
  if (!selfId) return [];
  return repo.listMyLeaveRequests(selfId);
}

export async function getLeaveBalancesForViewer(viewer: AuthUser) {
  if (!viewer) throw new ApiError(401, 'Not authenticated', 'UNAUTHORIZED');
  const selfId = await repo.findEmployeeIdByUserId(viewer.id);
  if (!selfId) return [];
  const balances = await repo.getLeaveBalances(selfId, new Date().getFullYear());
  return balances.map((b) => ({
    leave_type_id: b.leave_type_id,
    name: b.name,
    is_paid: b.is_paid,
    quota_days: Number(b.quota_days),
    used_days: Number(b.used_days),
    remaining_days: Number(b.quota_days) - Number(b.used_days),
  }));
}

export async function cancelLeaveRequest(id: string, viewer: AuthUser) {
  if (!viewer) throw new ApiError(401, 'Not authenticated', 'UNAUTHORIZED');
  const request = await repo.findLeaveRequestById(id);
  if (!request) throw new ApiError(404, 'Leave request not found', 'LEAVE_REQUEST_NOT_FOUND');
  const selfId = await repo.findEmployeeIdByUserId(viewer.id);
  if (request.employee_id !== selfId) {
    throw new ApiError(403, 'You can only cancel your own requests', 'FORBIDDEN');
  }
  if (request.status !== 'pending') {
    throw new ApiError(409, 'Only pending requests can be cancelled', 'NOT_PENDING');
  }
  const cancelled = await repo.cancelPendingRequest(id, request.employee_id);
  if (!cancelled) throw new ApiError(409, 'Only pending requests can be cancelled', 'NOT_PENDING');
  return cancelled;
}
