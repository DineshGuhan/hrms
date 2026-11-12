import { query } from '../../config/db.js';

export interface HealthStatus {
  status: 'ok' | 'degraded';
  database: 'up' | 'down';
  uptimeSeconds: number;
}

/** Check service + database health. Database is 'down' if the ping fails. */
export async function getHealth(): Promise<HealthStatus> {
  let database: 'up' | 'down' = 'down';
  try {
    await query('SELECT 1');
    database = 'up';
  } catch {
    database = 'down';
  }
  return {
    status: database === 'up' ? 'ok' : 'degraded',
    database,
    uptimeSeconds: Math.round(process.uptime()),
  };
}
