import { query } from '../../config/db.js';
import type { PoolClient } from 'pg';

export interface LeaveRequestRow {
  id: string;
  employee_id: string;
  leave_type_id: string;
  leave_type_name: string | null;
  start_date: string;
  end_date: string;
  days: string;
  reason: string | null;
  status: string;
  approver_id: string | null;
  approver_comment: string | null;
  decided_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

/** Any pending/approved request overlapping the range blocks a new request. */
export async function findOverlappingRequest(
  employeeId: string,
  startDate: string,
  endDate: string,
  _client?: PoolClient,
): Promise<LeaveRequestRow | null> {
  const { rows } = await query<LeaveRequestRow>(
    `SELECT lr.id
       FROM leave_requests lr
      WHERE lr.employee_id = $1
        AND lr.status IN ('pending', 'approved')
        AND daterange(lr.start_date, lr.end_date, '[]') && daterange($2::date, $3::date, '[]')
      LIMIT 1`,
    [employeeId, startDate, endDate],
  );
  return rows[0] ?? null;
}

/** Sum of approved unpaid-leave days overlapping the range (for proration). */
export async function countUnpaidLeaveDaysInRange(
  employeeId: string,
  startDate: string,
  endDate: string,
): Promise<number> {
  const { rows } = await query<{ days: string }>(
    `SELECT COALESCE(SUM(lr.days), 0)::text AS days
       FROM leave_requests lr
       JOIN leave_types lt ON lt.id = lr.leave_type_id
      WHERE lr.employee_id = $1
        AND lr.status = 'approved'
        AND lt.is_paid = false
        AND daterange(lr.start_date, lr.end_date, '[]') && daterange($2::date, $3::date, '[]')`,
    [employeeId, startDate, endDate],
  );
  return Number(rows[0].days);
}

export async function insertLeaveRequest(
  data: {
    employee_id: string;
    leave_type_id: string;
    start_date: string;
    end_date: string;
    days: number;
    reason: string;
  },
  client: PoolClient,
): Promise<LeaveRequestRow> {
  const { rows } = await client.query<LeaveRequestRow>(
    `INSERT INTO leave_requests (employee_id, leave_type_id, start_date, end_date, days, reason, status)
     VALUES ($1, $2, $3, $4, $5, $6, 'pending')
     RETURNING *`,
    [data.employee_id, data.leave_type_id, data.start_date, data.end_date, data.days, data.reason],
  );
  return rows[0];
}

export async function cancelPendingRequest(id: string, employeeId: string): Promise<LeaveRequestRow | null> {
  const { rows } = await query<LeaveRequestRow>(
    `UPDATE leave_requests
        SET status = 'cancelled', cancelled_at = now(), updated_at = now()
      WHERE id = $1 AND employee_id = $2 AND status = 'pending'
      RETURNING *`,
    [id, employeeId],
  );
  return rows[0] ?? null;
}

export async function listMyLeaveRequests(employeeId: string): Promise<LeaveRequestRow[]> {
  const { rows } = await query<LeaveRequestRow>(
    `SELECT lr.*, lt.name AS leave_type_name
       FROM leave_requests lr
       JOIN leave_types lt ON lt.id = lr.leave_type_id
      WHERE lr.employee_id = $1
      ORDER BY lr.created_at DESC`,
    [employeeId],
  );
  return rows;
}

export async function getLeaveBalances(
  employeeId: string,
  year: number,
): Promise<{ leave_type_id: string; name: string; is_paid: boolean; quota_days: string; used_days: string }[]> {
  const { rows } = await query<{
    leave_type_id: string;
    name: string;
    is_paid: boolean;
    quota_days: string;
    used_days: string;
  }>(
    `SELECT lt.id AS leave_type_id, lt.name, lt.is_paid,
            COALESCE(lb.quota_days, 0)::text AS quota_days,
            COALESCE(lb.used_days, 0)::text AS used_days
       FROM leave_types lt
       LEFT JOIN leave_balances lb ON lb.leave_type_id = lt.id AND lb.employee_id = $1 AND lb.year = $2
      WHERE lt.is_active = true
      ORDER BY lt.name`,
    [employeeId, year],
  );
  return rows;
}

export async function findLeaveRequestById(id: string): Promise<LeaveRequestRow | null> {
  const { rows } = await query<LeaveRequestRow>(`SELECT * FROM leave_requests WHERE id = $1`, [id]);
  return rows[0] ?? null;
}

/** Resolve the employee row for a user account (null when the user has none). */
export async function findEmployeeIdByUserId(userId: string): Promise<string | null> {
  const { rows } = await query<{ id: string }>(`SELECT id FROM employees WHERE user_id = $1`, [userId]);
  return rows[0]?.id ?? null;
}
