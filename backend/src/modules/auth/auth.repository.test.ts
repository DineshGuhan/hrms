import { Pool } from 'pg';
import { closePool } from '../../config/db.js';
import * as repo from './auth.repository.js';

jest.mock('pg', () => ({ Pool: jest.fn() }));

const MockPool = Pool as unknown as jest.Mock;

const rowsResult = (rows: unknown[]) => ({ rows, rowCount: rows.length });

beforeEach(async () => {
  MockPool.mockReset();
  await closePool(); // drop the cached pool so each test builds a fresh one
});

afterEach(async () => {
  await closePool();
});

function makePool(queryMock: jest.Mock) {
  const pool = { query: queryMock, connect: jest.fn(), end: jest.fn() };
  MockPool.mockImplementation(() => pool);
  return pool;
}

describe('auth repository (parameterized SQL)', () => {
  it('findUserByEmail joins roles and parameterizes the email', async () => {
    const q = jest.fn().mockResolvedValue(rowsResult([{ id: 'u1', roles: ['hr'] }]));
    makePool(q);

    const user = await repo.findUserByEmail('Asha@Example.com');
    expect(user?.roles).toEqual(['hr']);
    const [sql, params] = q.mock.calls[0];
    expect(sql).toContain('$1');
    expect(params).toEqual(['Asha@Example.com']);
    expect(sql).not.toMatch(/Asha@Example\.com/); // never string-interpolated
  });

  it('findUserByEmail returns null when no rows', async () => {
    makePool(jest.fn().mockResolvedValue(rowsResult([])));
    expect(await repo.findUserByEmail('ghost@example.com')).toBeNull();
  });

  it('recordFailedLogin increments and sets the lock time', async () => {
    const q = jest.fn().mockResolvedValue(rowsResult([]));
    makePool(q);
    const until = new Date('2030-01-01T00:00:00Z');
    await repo.recordFailedLogin('u1', until);
    const [sql, params] = q.mock.calls[0];
    expect(sql).toContain('failed_login_attempts + 1');
    expect(params).toEqual(['u1', until]);
  });

  it('resetLoginFailures clears the counter and lock', async () => {
    const q = jest.fn().mockResolvedValue(rowsResult([]));
    makePool(q);
    await repo.resetLoginFailures('u1');
    const [sql, params] = q.mock.calls[0];
    expect(sql).toContain('failed_login_attempts = 0');
    expect(params).toEqual(['u1']);
  });

  it('insertRefreshToken stores the hash and returns the id', async () => {
    const q = jest.fn().mockResolvedValue(rowsResult([{ id: 'rt9' }]));
    makePool(q);
    const expires = new Date('2030-06-01T00:00:00Z');
    const id = await repo.insertRefreshToken('u1', 'hash', expires);
    expect(id).toBe('rt9');
    const [sql, params] = q.mock.calls[0];
    expect(sql).toContain('INSERT INTO refresh_tokens');
    expect(params).toEqual(['u1', 'hash', expires]);
  });

  it('findRefreshTokenByHash looks up by hash and returns null when absent', async () => {
    const stored = { id: 'rt9', user_id: 'u1', token_hash: 'h', expires_at: new Date(), revoked_at: null };
    const q = jest.fn().mockResolvedValueOnce(rowsResult([stored])).mockResolvedValueOnce(rowsResult([]));
    makePool(q);
    expect(await repo.findRefreshTokenByHash('h')).toEqual(stored);
    expect(await repo.findRefreshTokenByHash('missing')).toBeNull();
  });

  it('revokeRefreshToken revokes by id', async () => {
    const q = jest.fn().mockResolvedValue(rowsResult([]));
    makePool(q);
    await repo.revokeRefreshToken('rt9');
    const [sql, params] = q.mock.calls[0];
    expect(sql).toContain('revoked_at = now()');
    expect(params).toEqual(['rt9']);
  });

  it('revokeAllRefreshTokensForUser revokes only active tokens', async () => {
    const q = jest.fn().mockResolvedValue(rowsResult([]));
    makePool(q);
    await repo.revokeAllRefreshTokensForUser('u1');
    const [sql, params] = q.mock.calls[0];
    expect(sql).toContain('revoked_at IS NULL');
    expect(params).toEqual(['u1']);
  });

  it('findUserRoles maps role names from the join', async () => {
    makePool(jest.fn().mockResolvedValue(rowsResult([{ name: 'admin' }, { name: 'hr' }])));
    expect(await repo.findUserRoles('u1')).toEqual(['admin', 'hr']);
  });

  it('findUserEmailById returns the email or an empty string', async () => {
    const q = jest.fn().mockResolvedValueOnce(rowsResult([{ email: 'a@b.co' }])).mockResolvedValueOnce(rowsResult([]));
    makePool(q);
    expect(await repo.findUserEmailById('u1')).toBe('a@b.co');
    expect(await repo.findUserEmailById('missing')).toBe('');
  });
});
