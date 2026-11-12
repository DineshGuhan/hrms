import { loadEnv } from './env.js';

const baseEnv = {
  NODE_ENV: 'test',
  PORT: '3000',
  DATABASE_URL: 'postgresql://postgres:postgres@localhost:5432/hrms_test',
  JWT_SECRET: 'a'.repeat(40),
  LOG_LEVEL: 'info',
};

describe('env config loader', () => {
  it('parses and returns a valid env', () => {
    const env = loadEnv(baseEnv);
    expect(env.PORT).toBe(3000);
    expect(env.DATABASE_URL).toBe(baseEnv.DATABASE_URL);
    expect(env.NODE_ENV).toBe('test');
  });

  it('defaults NODE_ENV to development when omitted', () => {
    const env = loadEnv({ ...baseEnv, NODE_ENV: undefined });
    expect(env.NODE_ENV).toBe('development');
  });

  it('throws on missing DATABASE_URL', () => {
    const missing = { ...baseEnv } as Record<string, string | undefined>;
    delete missing.DATABASE_URL;
    expect(() => loadEnv(missing)).toThrow(/DATABASE_URL/);
  });

  it('throws on missing JWT_SECRET', () => {
    const missing = { ...baseEnv } as Record<string, string | undefined>;
    delete missing.JWT_SECRET;
    expect(() => loadEnv(missing)).toThrow(/JWT_SECRET/);
  });

  it('throws on short JWT_SECRET (< 40 chars)', () => {
    expect(() => loadEnv({ ...baseEnv, JWT_SECRET: 'tooshort' })).toThrow(/JWT_SECRET/);
  });

  it('throws on non-numeric PORT', () => {
    expect(() => loadEnv({ ...baseEnv, PORT: 'not-a-number' })).toThrow(/PORT/);
  });

  it('throws on invalid NODE_ENV value', () => {
    expect(() => loadEnv({ ...baseEnv, NODE_ENV: 'staging' })).toThrow(/NODE_ENV/);
  });
});
