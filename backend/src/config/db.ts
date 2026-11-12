import { Pool, type PoolClient } from 'pg';
import { getEnv } from './env.js';

let pool: Pool | null = null;

/** Create (or return) the shared connection pool. */
export function getPool(): Pool {
  if (!pool) {
    const env = getEnv();
    pool = new Pool({
      connectionString: env.NODE_ENV === 'test' ? env.DATABASE_URL_TEST || env.DATABASE_URL : env.DATABASE_URL,
      max: 10,
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 10_000,
    });
  }
  return pool;
}

/** Run a parameterized query (never string-built SQL). */
export function query<T extends Record<string, unknown> = Record<string, unknown>>(
  text: string,
  params: unknown[] = [],
): Promise<{ rows: T[]; rowCount: number | null }> {
  return getPool().query(text, params);
}

/**
 * Run a function inside a transaction; commits on success, rolls back on error.
 * Used by leave approval and payroll flows that must update multiple tables atomically.
 */
export async function withTransaction<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await getPool().connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

/** Close the pool (used by tests and graceful shutdown). */
export async function closePool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
  }
}
