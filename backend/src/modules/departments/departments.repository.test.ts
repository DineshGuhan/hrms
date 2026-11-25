import { Pool } from 'pg';
import { closePool } from '../../config/db.js';
import * as repo from './departments.repository.js';

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

describe('departments repository (parameterized SQL)', () => {
  it('insertDepartment parameterizes name and description', async () => {
    const q = jest.fn().mockResolvedValue({ rows: [{ id: 'd1', name: 'Sales' }], rowCount: 1 });
    makePool(q);
    const row = await repo.insertDepartment('Sales', 'Revenue team');
    expect(row.name).toBe('Sales');
    const [sql, params] = q.mock.calls[0];
    expect(sql).toContain('INSERT INTO departments');
    expect(params).toEqual(['Sales', 'Revenue team']);
    expect(sql).not.toMatch(/Sales/); // not interpolated
  });

  it('findDepartmentById and nameExists parameterize correctly', async () => {
    const q = jest.fn().mockResolvedValueOnce({ rows: [], rowCount: 0 }).mockResolvedValueOnce({ rows: [{ exists: false }], rowCount: 1 });
    makePool(q);
    expect(await repo.findDepartmentById('d1')).toBeNull();
    expect(await repo.nameExists('X')).toBe(false);
    expect(q.mock.calls[0][1]).toEqual(['d1']);
    expect(q.mock.calls[1][1]).toEqual(['X']);
  });

  it('listDepartments computes employee counts and head names via joins', async () => {
    const q = jest.fn().mockResolvedValue({
      rows: [{ id: 'd1', name: 'Eng', employee_count: 7, head_name: 'Asha Rao' }],
      rowCount: 1,
    });
    makePool(q);
    const rows = await repo.listDepartments();
    expect(rows[0].employee_count).toBe(7);
    const [sql] = q.mock.calls[0];
    expect(sql).toContain('COUNT(e.id)');
    expect(sql).toContain('head_employee_id');
  });

  it('updateDepartmentFields builds only provided SET clauses', async () => {
    const q = jest.fn().mockResolvedValue({ rows: [{ id: 'd1' }], rowCount: 1 });
    makePool(q);
    await repo.updateDepartmentFields('d1', { name: 'New' });
    const [sql, params] = q.mock.calls[0];
    expect(sql).toContain('name = $1');
    expect(sql).not.toContain('description =');
    expect(params).toEqual(['New', 'd1']);
  });

  it('setDepartmentHead and setDepartmentStatus parameterize', async () => {
    const q = jest.fn().mockResolvedValue({ rows: [{ id: 'd1' }], rowCount: 1 });
    makePool(q);
    await repo.setDepartmentHead('d1', 'e9');
    expect(q.mock.calls[0][1]).toEqual(['d1', 'e9']);
    await repo.setDepartmentStatus('d1', 'archived');
    expect(q.mock.calls[1][1]).toEqual(['d1', 'archived']);
  });

  it('findEmployeeHeadCandidate reads the employment status', async () => {
    const q = jest.fn().mockResolvedValue({ rows: [{ id: 'e9', status: 'active' }], rowCount: 1 });
    makePool(q);
    const candidate = await repo.findEmployeeHeadCandidate('e9');
    expect(candidate).toMatchObject({ status: 'active' });
    const [sql] = q.mock.calls[0];
    expect(sql).toContain('employment_status');
  });
});
