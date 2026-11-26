import { query } from '../../config/db.js';

export interface LeaveTypeRow {
  id: string;
  name: string;
  quota_days: string;
  is_paid: boolean;
  is_active: boolean;
  created_at: Date;
}

export interface LeaveTypeWithUsage extends LeaveTypeRow {
  used_days: string;
}

export async function insertLeaveType(
  name: string,
  quotaDays: number,
  isPaid: boolean,
): Promise<LeaveTypeRow> {
  const { rows } = await query<LeaveTypeRow>(
    `INSERT INTO leave_types (name, quota_days, is_paid) VALUES ($1, $2, $3) RETURNING *`,
    [name, quotaDays, isPaid],
  );
  return rows[0];
}

export async function findLeaveTypeById(id: string): Promise<LeaveTypeRow | null> {
  const { rows } = await query<LeaveTypeRow>(`SELECT * FROM leave_types WHERE id = $1`, [id]);
  return rows[0] ?? null;
}

export async function leaveTypeNameExists(name: string): Promise<boolean> {
  const { rows } = await query<{ exists: boolean }>(
    `SELECT EXISTS(SELECT 1 FROM leave_types WHERE name = $1) AS "exists"`,
    [name],
  );
  return rows[0].exists;
}

/** All types with the current year's usage; archived ones included for the HR view. */
export async function listLeaveTypesWithUsage(year: number): Promise<LeaveTypeWithUsage[]> {
  const { rows } = await query<LeaveTypeWithUsage>(
    `SELECT lt.*,
            COALESCE(SUM(lb.used_days), 0)::numeric(5,1) AS used_days
       FROM leave_types lt
       LEFT JOIN leave_balances lb ON lb.leave_type_id = lt.id AND lb.year = $1
      GROUP BY lt.id
      ORDER BY lt.name`,
    [year],
  );
  return rows;
}

export async function updateLeaveTypeFields(
  id: string,
  fields: { name?: string; quota_days?: number; is_paid?: boolean },
): Promise<LeaveTypeRow | null> {
  const sets: string[] = [];
  const params: unknown[] = [];
  if (fields.name !== undefined) {
    params.push(fields.name);
    sets.push(`name = $${params.length}`);
  }
  if (fields.quota_days !== undefined) {
    params.push(fields.quota_days);
    sets.push(`quota_days = $${params.length}`);
  }
  if (fields.is_paid !== undefined) {
    params.push(fields.is_paid);
    sets.push(`is_paid = $${params.length}`);
  }
  if (sets.length === 0) return findLeaveTypeById(id);
  params.push(id);
  sets.push(`updated_at = now()`);
  const { rows } = await query<LeaveTypeRow>(
    `UPDATE leave_types SET ${sets.join(', ')} WHERE id = $${params.length} RETURNING *`,
    params,
  );
  return rows[0] ?? null;
}

export async function setLeaveTypeActive(id: string, isActive: boolean): Promise<LeaveTypeRow | null> {
  const { rows } = await query<LeaveTypeRow>(
    `UPDATE leave_types SET is_active = $2 WHERE id = $1 RETURNING *`,
    [id, isActive],
  );
  return rows[0] ?? null;
}
