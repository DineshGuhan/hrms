import { Pool } from 'pg';
import { closePool } from '../../config/db.js';
import * as repo from './employees.repository.js';

jest.mock('pg', () => ({ Pool: jest.fn() }));

const MockPool = Pool as unknown as jest.Mock;

beforeEach(async () => {
  MockPool.mockReset();
  await closePool();
});

afterEach(async () => {
  await closePool();
});

function makePool(queryMock: jest.Mock) {
  const pool = { query: queryMock, connect: jest.fn(), end: jest.fn() };
  MockPool.mockImplementation(() => pool);
  return pool;
}

describe('employees repository (parameterized SQL)', () => {
  it('insertEmployee creates the user then the employee in one flow', async () => {
    const q = jest.fn().mockResolvedValue({ rows: [{ id: 'u9' }], rowCount: 1 });
    const pool = makePool(q);
    // First call: users insert. Second: employees insert.
    q.mockImplementationOnce(async () => ({ rows: [{ id: 'u9' }], rowCount: 1 })).mockImplementationOnce(
      async () => ({
        rows: [{ id: 'e9', user_id: 'u9', first_name: 'Ravi', last_name: 'Kumar' }],
        rowCount: 1,
      }),
    );

    const row = await repo.insertEmployee(
      {
        first_name: 'Ravi',
        last_name: 'Kumar',
        email: 'ravi@example.com',
        salary_encrypted: Buffer.from([1]),
        bank_details_encrypted: null,
        national_id_encrypted: null,
      },
      // The service always passes a transaction client; emulate it with the pool shape.
      pool as never,
    );

    expect(row.id).toBe('e9');
    const [usersSql, usersParams] = q.mock.calls[0];
    expect(usersSql).toContain('INSERT INTO users');
    expect(usersParams).toEqual(['ravi@example.com']);
    const [empSql, empParams] = q.mock.calls[1];
    expect(empSql).toContain('INSERT INTO employees');
    expect(empParams[0]).toBe('u9');
    expect(empSql).not.toMatch(/ravi@example\.com/);
  });

  it('findEmployeeById joins users and parameterizes the id', async () => {
    const q = jest.fn().mockResolvedValue({ rows: [], rowCount: 0 });
    makePool(q);
    expect(await repo.findEmployeeById('e1')).toBeNull();
    const [sql, params] = q.mock.calls[0];
    expect(sql).toContain('$1');
    expect(params).toEqual(['e1']);
  });

  it('emailExists checks the users table', async () => {
    const q = jest.fn().mockResolvedValue({ rows: [{ exists: true }], rowCount: 1 });
    makePool(q);
    expect(await repo.emailExists('a@b.co')).toBe(true);
    const [sql, params] = q.mock.calls[0];
    expect(sql).toContain('FROM users');
    expect(params).toEqual(['a@b.co']);
  });

  it('countEmployees builds filtered parameterized SQL', async () => {
    const q = jest.fn().mockResolvedValue({ rows: [{ count: '3' }], rowCount: 1 });
    makePool(q);
    const count = await repo.countEmployees({ search: 'asha', department: 'd1', status: 'active' });
    expect(count).toBe(3);
    const [sql, params] = q.mock.calls[0];
    expect(sql).toContain('ILIKE');
    expect(sql).toContain('department_id');
    expect(sql).toContain('employment_status');
    expect(params).toEqual(['%asha%', 'd1', 'active']);
  });

  it('listEmployees applies scope and pagination parameters', async () => {
    const q = jest.fn().mockResolvedValue({ rows: [], rowCount: 0 });
    makePool(q);
    await repo.listEmployees({ search: 'ra', limit: 10, offset: 10 }, { managerId: 'mg-row' });
    const [sql, params] = q.mock.calls[0];
    expect(sql).toContain('e.manager_id = $2');
    expect(sql).toContain('LIMIT $3 OFFSET $4');
    expect(params).toEqual(['%ra%', 'mg-row', 10, 10]);
  });

  it('updateEmployeeFields builds SET clauses and returns null when nothing set', async () => {
    const q = jest.fn().mockResolvedValue({ rows: [{ id: 'e1' }], rowCount: 1 });
    makePool(q);
    await repo.updateEmployeeFields('e1', { phone: '9', job_title: 'Lead' }, { salary_encrypted: Buffer.from([7]) });
    const [sql, params] = q.mock.calls[0];
    expect(sql).toContain('phone = $1');
    expect(sql).toContain('job_title = $2');
    expect(sql).toContain('salary_encrypted = $3');
    expect(params).toEqual(['9', 'Lead', Buffer.from([7]), 'e1']);

    // No fields → falls back to find (findEmployeeById path).
    await closePool(); // drop the cached pool so the fallback uses q2
    const q2 = jest.fn().mockResolvedValue({ rows: [], rowCount: 0 });
    makePool(q2);
    expect(await repo.updateEmployeeFields('e1', {})).toBeNull();
  });

  it('setEmployeeStatus updates employment_status with parameters', async () => {
    const q = jest.fn().mockResolvedValue({ rows: [{ id: 'e1' }], rowCount: 1 });
    makePool(q);
    await repo.setEmployeeStatus('e1', 'inactive');
    const [sql, params] = q.mock.calls[0];
    expect(sql).toContain('employment_status = $2');
    expect(params).toEqual(['e1', 'inactive']);
  });

  it('findEmployeeByUserId parameterizes the user id', async () => {
    const q = jest.fn().mockResolvedValue({ rows: [], rowCount: 0 });
    makePool(q);
    await repo.findEmployeeByUserId('u1');
    const [sql, params] = q.mock.calls[0];
    expect(sql).toContain('user_id = $1');
    expect(params).toEqual(['u1']);
  });
});
