import 'dotenv/config';
import { createApp } from './app.js';
import { getEnv } from './config/env.js';
import { getPool, closePool } from './config/db.js';
import { logger } from './utils/logger.js';

async function main(): Promise<void> {
  const env = getEnv();
  const app = createApp();

  // Verify DB connectivity at startup (fail fast).
  try {
    await getPool().query('SELECT 1');
    logger.info('Database connection OK');
  } catch (err) {
    logger.error({ err }, 'Database connection failed');
    process.exit(1);
  }

  const server = app.listen(env.PORT, () => {
    logger.info(`HRMS backend listening on http://localhost:${env.PORT}`);
  });

  const shutdown = async (): Promise<void> => {
    logger.info('Shutting down...');
    server.close();
    await closePool();
    process.exit(0);
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

void main();
