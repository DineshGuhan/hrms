import { query } from '../../config/db.js';

export interface DepartmentRow {
  id: string;
  name: string;
  description: string | null;
  parent_id: string | null;
  head_employee_id: string | null;
  status: string;
  created_at: Date;
  updated_at: Date;
}

export interface DepartmentWithCount extends DepartmentRow {
  employee_count: number;
  head_name: string | null;
}

export async function insertDepartment(
  name: string,
  description: string | null,
): Promise<DepartmentRow> {
  const { rows } = await query<DepartmentRow>(
    `INSERT INTO departments (name, description) VALUES ($1, $2) RETURNING *`,
    [name, description],
  );
  return rows[0];
}

export async function findDepartmentById(id: string): Promise<DepartmentRow | null> {
  const { rows } = await query<DepartmentRow>(`SELECT * FROM departments WHERE id = $1`, [id]);
  return rows[0] ?? null;
}

export async function nameExists(name: string): Promise<boolean> {
  const { rows } = await query<{ exists: boolean }>(
    `SELECT EXISTS(SELECT 1 FROM departments WHERE name = $1) AS "exists"`,
    [name],
  );
  return rows[0].exists;
}

/** List departments with employee counts computed via join (FR-DEP-02) and head names. */
export async function listDepartments(): Promise<DepartmentWithCount[]> {
  const { rows } = await query<DepartmentWithCount>(
    `SELECT d.*,
            COUNT(e.id)::int AS employee_count,
            (he.first_name || ' ' || he.last_name) AS head_name
       FROM departments d
       LEFT JOIN employees e ON e.department_id = d.id
       LEFT JOIN employees he ON he.id = d.head_employee_id
      GROUP BY d.id, he.first_name, he.last_name
      ORDER BY d.name`,
  );
  return rows;
}

export async function updateDepartmentFields(
  id: string,
  fields: { name?: string; description?: string },
): Promise<DepartmentRow | null> {
  const sets: string[] = [];
  const params: unknown[] = [];
  if (fields.name !== undefined) {
    params.push(fields.name);
    sets.push(`name = $${params.length}`);
  }
  if (fields.description !== undefined) {
    params.push(fields.description);
    sets.push(`description = $${params.length}`);
  }
  if (sets.length === 0) return findDepartmentById(id);
  params.push(id);
  sets.push(`updated_at = now()`);
  const { rows } = await query<DepartmentRow>(
    `UPDATE departments SET ${sets.join(', ')} WHERE id = $${params.length} RETURNING *`,
    params,
  );
  return rows[0] ?? null;
}

export async function setDepartmentHead(id: string, headEmployeeId: string | null): Promise<DepartmentRow | null> {
  const { rows } = await query<DepartmentRow>(
    `UPDATE departments SET head_employee_id = $2, updated_at = now() WHERE id = $1 RETURNING *`,
    [id, headEmployeeId],
  );
  return rows[0] ?? null;
}

export async function setDepartmentStatus(id: string, status: 'active' | 'archived'): Promise<DepartmentRow | null> {
  const { rows } = await query<DepartmentRow>(
    `UPDATE departments SET status = $2, updated_at = now() WHERE id = $1 RETURNING *`,
    [id, status],
  );
  return rows[0] ?? null;
}

/** Head validation helpers (FR-DEP-02: head must be an active employee). */
export async function findEmployeeHeadCandidate(employeeId: string): Promise<{ id: string; status: string } | null> {
  const { rows } = await query<{ id: string; status: string }>(
    `SELECT id, employment_status AS status FROM employees WHERE id = $1`,
    [employeeId],
  );
  return rows[0] ?? null;
}
