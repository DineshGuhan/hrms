import { Pool } from 'pg';
import { closePool } from '../../config/db.js';
import * as repo from './leave-requests.repository.js';

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

describe('leave requests repository (parameterized SQL)', () => {
  it('findOverlappingRequest uses a daterange overlap with all three params', async () => {
    const q = jest.fn().mockResolvedValue({ rows: [{ id: 'lr9' }], rowCount: 1 });
    makePool(q);
    const found = await repo.findOverlappingRequest('e1', '2030-06-03', '2030-06-07');
    expect(found?.id).toBe('lr9');
    const [sql, params] = q.mock.calls[0];
    expect(sql).toContain("IN ('pending', 'approved')");
    expect(sql).toContain('&&');
    expect(params).toEqual(['e1', '2030-06-03', '2030-06-07']);
    expect(sql).not.toMatch(/2030-06-03/); // never interpolated
  });

  it('insertLeaveRequest inserts as pending with parameterized values', async () => {
    const q = jest.fn().mockResolvedValue({ rows: [{ id: 'lr1' }], rowCount: 1 });
    makePool(q);
    const client = { query: q } as never;
    const created = await repo.insertLeaveRequest(
      {
        employee_id: 'e1',
        leave_type_id: 'lt1',
        start_date: '2030-06-03',
        end_date: '2030-06-07',
        days: 5,
        reason: 'Family',
      },
      client,
    );
    expect(created.id).toBe('lr1');
    const [sql, params] = q.mock.calls[0];
    expect(sql).toContain("INSERT INTO leave_requests");
    expect(params).toEqual(['e1', 'lt1', '2030-06-03', '2030-06-07', 5, 'Family']);
  });

  it('cancelPendingRequest only cancels pending requests of the owner', async () => {
    const q = jest.fn().mockResolvedValue({ rows: [{ id: 'lr1', status: 'cancelled' }], rowCount: 1 });
    makePool(q);
    await repo.cancelPendingRequest('lr1', 'e1');
    const [sql, params] = q.mock.calls[0];
    expect(sql).toContain("status = 'pending'");
    expect(sql).toContain('employee_id = $2');
    expect(params).toEqual(['lr1', 'e1']);
  });

  it('getLeaveBalances reads balances for the employee and year', async () => {
    const q = jest.fn().mockResolvedValue({ rows: [], rowCount: 0 });
    makePool(q);
    await repo.getLeaveBalances('e1', 2026);
    const [sql, params] = q.mock.calls[0];
    expect(sql).toContain('leave_balances');
    expect(params).toEqual(['e1', 2026]);
  });

  it('findEmployeeIdByUserId resolves the employee id', async () => {
    const q = jest.fn().mockResolvedValue({ rows: [{ id: 'e1' }], rowCount: 1 });
    makePool(q);
    expect(await repo.findEmployeeIdByUserId('u1')).toBe('e1');
    expect(q.mock.calls[0][1]).toEqual(['u1']);
  });
});
