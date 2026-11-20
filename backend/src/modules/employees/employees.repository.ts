import { query } from '../../config/db.js';
import type { PoolClient } from 'pg';

export interface EmployeeRow {
  id: string;
  user_id: string | null;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  job_title: string | null;
  department_id: string | null;
  manager_id: string | null;
  date_of_birth: string | null;
  join_date: string | null;
  employment_status: string;
  salary_encrypted: Buffer | null;
  bank_details_encrypted: Buffer | null;
  national_id_encrypted: Buffer | null;
  created_at: Date;
  updated_at: Date;
}

export interface ListFilters {
  search?: string;
  department?: string;
  status?: 'active' | 'inactive';
  limit: number;
  offset: number;
}

const LIST_COLUMNS = `e.id, e.user_id, e.first_name, e.last_name, u.email, e.phone, e.job_title,
  e.department_id, e.manager_id, e.join_date, e.employment_status`;

export async function insertEmployee(
  data: {
    first_name: string;
    last_name: string;
    email: string;
    phone?: string;
    address?: string;
    job_title?: string;
    department_id?: string;
    manager_id?: string;
    date_of_birth?: string;
    join_date?: string;
    salary_encrypted: Buffer | null;
    bank_details_encrypted: Buffer | null;
    national_id_encrypted: Buffer | null;
  },
  client: PoolClient,
): Promise<EmployeeRow> {
  // Email lives on users; create the login row first (no password yet — the
  // invitation flow sets it), then the employee record, in one transaction.
  const user = await client.query<{ id: string }>(
    `INSERT INTO users (email) VALUES ($1) RETURNING id`,
    [data.email],
  );
  const userId = user.rows[0].id;
  const { rows } = await client.query<EmployeeRow>(
    `INSERT INTO employees
       (user_id, first_name, last_name, phone, address, job_title, department_id, manager_id,
        date_of_birth, join_date, employment_status, salary_encrypted, bank_details_encrypted, national_id_encrypted)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'active',$11,$12,$13)
     RETURNING *`,
    [
      userId,
      data.first_name,
      data.last_name,
      data.phone ?? null,
      data.address ?? null,
      data.job_title ?? null,
      data.department_id ?? null,
      data.manager_id ?? null,
      data.date_of_birth ?? null,
      data.join_date ?? null,
      data.salary_encrypted,
      data.bank_details_encrypted,
      data.national_id_encrypted,
    ],
  );
  rows[0].email = data.email;
  return rows[0];
}

export async function findEmployeeById(id: string): Promise<EmployeeRow | null> {
  const { rows } = await query<EmployeeRow>(
    `SELECT e.*, u.email
       FROM employees e
       LEFT JOIN users u ON u.id = e.user_id
      WHERE e.id = $1`,
    [id],
  );
  return rows[0] ?? null;
}

export async function emailExists(email: string): Promise<boolean> {
  const { rows } = await query<{ exists: boolean }>(
    `SELECT EXISTS(SELECT 1 FROM users WHERE email = $1) AS "exists"`,
    [email],
  );
  return rows[0].exists;
}

/** Count employees for pagination meta (same scoping filters as the list). */
export async function countEmployees(filters: Omit<ListFilters, 'limit' | 'offset'>): Promise<number> {
  const clauses: string[] = [];
  const params: unknown[] = [];
  if (filters.search) {
    params.push(`%${filters.search}%`);
    clauses.push(`(e.first_name ILIKE $${params.length} OR e.last_name ILIKE $${params.length} OR u.email ILIKE $${params.length})`);
  }
  if (filters.department) {
    params.push(filters.department);
    clauses.push(`e.department_id = $${params.length}`);
  }
  if (filters.status) {
    params.push(filters.status);
    clauses.push(`e.employment_status = $${params.length}`);
  }
  const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
  const { rows } = await query<{ count: string }>(
    `SELECT count(*)::text AS count
       FROM employees e
       LEFT JOIN users u ON u.id = e.user_id
       ${where}`,
    params,
  );
  return Number(rows[0].count);
}

export async function listEmployees(
  filters: ListFilters,
  /** When set, restricts to direct reports (manager) or a single row (employee). */
  scope?: { managerId?: string; selfEmployeeId?: string },
): Promise<EmployeeRow[]> {
  const clauses: string[] = [];
  const params: unknown[] = [];
  if (filters.search) {
    params.push(`%${filters.search}%`);
    clauses.push(`(e.first_name ILIKE $${params.length} OR e.last_name ILIKE $${params.length} OR u.email ILIKE $${params.length})`);
  }
  if (filters.department) {
    params.push(filters.department);
    clauses.push(`e.department_id = $${params.length}`);
  }
  if (filters.status) {
    params.push(filters.status);
    clauses.push(`e.employment_status = $${params.length}`);
  }
  if (scope?.managerId) {
    params.push(scope.managerId);
    clauses.push(`e.manager_id = $${params.length}`);
  }
  if (scope?.selfEmployeeId) {
    params.push(scope.selfEmployeeId);
    clauses.push(`e.id = $${params.length}`);
  }
  const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
  params.push(filters.limit, filters.offset);
  const limitIdx = params.length - 1;
  const offsetIdx = params.length;
  const { rows } = await query<EmployeeRow>(
    `SELECT ${LIST_COLUMNS}
       FROM employees e
       LEFT JOIN users u ON u.id = e.user_id
       ${where}
      ORDER BY e.last_name, e.first_name
      LIMIT $${limitIdx} OFFSET $${offsetIdx}`,
    params,
  );
  return rows;
}

export async function updateEmployeeFields(
  id: string,
  fields: Record<string, unknown>,
  encrypted?: { salary_encrypted?: Buffer | null; bank_details_encrypted?: Buffer | null; national_id_encrypted?: Buffer | null },
): Promise<EmployeeRow | null> {
  const sets: string[] = [];
  const params: unknown[] = [];
  for (const [column, value] of Object.entries(fields)) {
    params.push(value);
    sets.push(`${column} = $${params.length}`);
  }
  if (encrypted) {
    for (const [column, value] of Object.entries(encrypted)) {
      if (value === undefined) continue;
      params.push(value);
      sets.push(`${column} = $${params.length}`);
    }
  }
  if (sets.length === 0) return findEmployeeById(id);
  params.push(id);
  sets.push(`updated_at = now()`);
  const { rows } = await query<EmployeeRow>(
    `UPDATE employees SET ${sets.join(', ')} WHERE id = $${params.length} RETURNING *`,
    params,
  );
  return rows[0] ?? null;
}

export async function setEmployeeStatus(id: string, status: 'active' | 'inactive'): Promise<EmployeeRow | null> {
  const { rows } = await query<EmployeeRow>(
    `UPDATE employees SET employment_status = $2, updated_at = now() WHERE id = $1 RETURNING *`,
    [id, status],
  );
  return rows[0] ?? null;
}

export async function findEmployeeByUserId(userId: string): Promise<EmployeeRow | null> {
  const { rows } = await query<EmployeeRow>(`SELECT * FROM employees WHERE user_id = $1`, [userId]);
  return rows[0] ?? null;
}
