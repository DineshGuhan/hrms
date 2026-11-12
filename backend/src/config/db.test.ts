import { Pool } from 'pg';
import * as db from './db.js';

jest.mock('pg', () => ({
  Pool: jest.fn(),
}));

const MockPool = Pool as unknown as jest.Mock;

function makePool() {
  const client = {
    query: jest.fn().mockResolvedValue({ rows: [], rowCount: 0 }),
    release: jest.fn(),
  };
  const pool = {
    query: jest.fn().mockResolvedValue({ rows: [], rowCount: 0 }),
    connect: jest.fn().mockResolvedValue(client),
    end: jest.fn().mockResolvedValue(undefined),
  };
  MockPool.mockImplementation(() => pool);
  return { pool, client };
}

beforeEach(() => {
  MockPool.mockReset();
});

afterEach(async () => {
  await db.closePool(); // clears the module-level pool cache
});

describe('db module', () => {
  it('creates a single Pool lazily and reuses it', () => {
    const { pool } = makePool();
    db.getPool();
    db.getPool();
    expect(MockPool).toHaveBeenCalledTimes(1);
    expect(db.getPool()).toBe(pool);
  });

  it('query() delegates to the pool', async () => {
    const { pool } = makePool();
    const result = await db.query('SELECT 1', [1]);
    expect(pool.query).toHaveBeenCalledWith('SELECT 1', [1]);
    expect(result.rowCount).toBe(0);
  });

  it('withTransaction commits on success', async () => {
    const { client } = makePool();
    const fn = jest.fn().mockResolvedValue('ok');
    const result = await db.withTransaction(fn);
    expect(client.query).toHaveBeenCalledWith('BEGIN');
    expect(client.query).toHaveBeenCalledWith('COMMIT');
    expect(client.query).not.toHaveBeenCalledWith('ROLLBACK');
    expect(result).toBe('ok');
    expect(client.release).toHaveBeenCalled();
  });

  it('withTransaction rolls back and rethrows on failure', async () => {
    const { client } = makePool();
    const fn = jest.fn().mockRejectedValue(new Error('boom'));
    await expect(db.withTransaction(fn)).rejects.toThrow('boom');
    expect(client.query).toHaveBeenCalledWith('BEGIN');
    expect(client.query).toHaveBeenCalledWith('ROLLBACK');
    expect(client.query).not.toHaveBeenCalledWith('COMMIT');
    expect(client.release).toHaveBeenCalled();
  });

  it('closePool ends the pool and clears the cache', async () => {
    const { pool } = makePool();
    db.getPool();
    await db.closePool();
    expect(pool.end).toHaveBeenCalled();
    // A new pool is created after close.
    const { pool: pool2 } = makePool();
    db.getPool();
    expect(MockPool).toHaveBeenCalledTimes(2);
    expect(db.getPool()).toBe(pool2);
  });
});
