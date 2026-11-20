import { loginSchema } from './auth.schema.js';

describe('login schema', () => {
  it('accepts a valid email and password and normalizes the email', () => {
    const parsed = loginSchema.parse({ email: '  Asha@Example.COM ', password: 'long-enough' });
    expect(parsed.email).toBe('asha@example.com');
    expect(parsed.password).toBe('long-enough');
  });

  it('rejects a malformed email', () => {
    expect(() => loginSchema.parse({ email: 'not-an-email', password: 'long-enough' })).toThrow(
      /email/i,
    );
  });

  it('rejects a password shorter than 8 characters', () => {
    expect(() => loginSchema.parse({ email: 'a@b.c', password: 'short' })).toThrow();
  });

  it('rejects a password longer than 128 characters', () => {
    expect(() => loginSchema.parse({ email: 'a@b.c', password: 'x'.repeat(129) })).toThrow();
  });

  it('rejects missing fields', () => {
    expect(() => loginSchema.parse({})).toThrow();
  });
});
