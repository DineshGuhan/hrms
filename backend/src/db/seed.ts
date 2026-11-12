import 'dotenv/config';
import { getPool, closePool } from '../config/db.js';
import { logger } from '../utils/logger.js';

/**
 * Seed data for local development/testing.
 * Dev-only: run with `npm run seed` after migrations.
 */
async function main(): Promise<void> {
  const pool = getPool();
  const { rows } = await pool.query<{ name: string }>(
    `SELECT name FROM roles WHERE name = 'admin'`,
  );
  if (rows.length === 0) {
    await pool.query(
      `INSERT INTO roles (name) VALUES ('admin'), ('hr'), ('manager'), ('employee')`,
    );
    logger.info('Seeded 4 roles');
  } else {
    logger.info('Roles already seeded');
  }
  await closePool();
}

void main().catch((err) => {
  logger.error(err);
  process.exit(1);
});
