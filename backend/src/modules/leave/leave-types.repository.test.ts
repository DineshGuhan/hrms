import { Pool } from 'pg';
import { closePool } from '../../config/db.js';
import * as repo from './leave-types.repository.js';

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

describe('leave types repository (parameterized SQL)', () => {
  it('insertLeaveType parameterizes name, quota, and paid flag', async () => {
    const q = jest.fn().mockResolvedValue({ rows: [{ id: 'lt9', name: 'Parental' }], rowCount: 1 });
    makePool(q);
    const row = await repo.insertLeaveType('Parental', 10, true);
    expect(row.name).toBe('Parental');
    const [sql, params] = q.mock.calls[0];
    expect(sql).toContain('INSERT INTO leave_types');
    expect(params).toEqual(['Parental', 10, true]);
    expect(sql).not.toMatch(/Parental/); // never interpolated
  });

  it('listLeaveTypesWithUsage joins balances for the given year', async () => {
    const q = jest.fn().mockResolvedValue({ rows: [], rowCount: 0 });
    makePool(q);
    await repo.listLeaveTypesWithUsage(2026);
    const [sql, params] = q.mock.calls[0];
    expect(sql).toContain('LEFT JOIN leave_balances lb ON lb.leave_type_id = lt.id AND lb.year = $1');
    expect(params).toEqual([2026]);
  });

  it('updateLeaveTypeFields builds only provided SET clauses', async () => {
    const q = jest.fn().mockResolvedValue({ rows: [{ id: 'lt1' }], rowCount: 1 });
    makePool(q);
    await repo.updateLeaveTypeFields('lt1', { quota_days: 12 });
    const [sql, params] = q.mock.calls[0];
    expect(sql).toContain('quota_days = $1');
    expect(sql).not.toContain('name =');
    expect(params).toEqual([12, 'lt1']);
  });

  it('setLeaveTypeActive flips the flag with parameters', async () => {
    const q = jest.fn().mockResolvedValue({ rows: [{ id: 'lt1' }], rowCount: 1 });
    makePool(q);
    await repo.setLeaveTypeActive('lt1', false);
    const [sql, params] = q.mock.calls[0];
    expect(sql).toContain('is_active = $2');
    expect(params).toEqual(['lt1', false]);
  });

  it('leaveTypeNameExists checks the leave_types table', async () => {
    const q = jest.fn().mockResolvedValue({ rows: [{ exists: false }], rowCount: 1 });
    makePool(q);
    expect(await repo.leaveTypeNameExists('X')).toBe(false);
    expect(q.mock.calls[0][1]).toEqual(['X']);
  });
});
