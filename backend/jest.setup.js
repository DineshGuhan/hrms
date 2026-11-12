// Jest setup: provide a valid env for modules that read env at import time.
process.env.NODE_ENV = process.env.NODE_ENV || 'test';
process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/hrms_test';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret-'.padEnd(40, 'x');
process.env.LOG_LEVEL = 'warn';
