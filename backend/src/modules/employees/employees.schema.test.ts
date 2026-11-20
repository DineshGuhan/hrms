import {
  createEmployeeSchema,
  selfUpdateSchema,
  adminUpdateSchema,
  statusChangeSchema,
  listQuerySchema,
} from './employees.schema.js';

describe('employees schemas', () => {
  it('create: accepts a valid payload and normalizes the email', () => {
    const parsed = createEmployeeSchema.parse({
      first_name: ' Ravi ',
      last_name: 'Kumar',
      email: ' Ravi@Example.COM ',
      salary: '600000',
    });
    expect(parsed.email).toBe('ravi@example.com');
    expect(parsed.first_name).toBe('Ravi');
  });

  it('create: rejects unknown fields and bad values', () => {
    expect(() => createEmployeeSchema.parse({ first_name: 'A', last_name: 'B', email: 'x', hacker: true })).toThrow();
    expect(() => createEmployeeSchema.parse({ first_name: '', last_name: 'B', email: 'a@b.co' })).toThrow();
    expect(() => createEmployeeSchema.parse({ first_name: 'A', last_name: 'B', email: 'not-an-email' })).toThrow();
  });

  it('self update: allows only contact fields', () => {
    expect(selfUpdateSchema.parse({ phone: '123', address: 'x' })).toMatchObject({ phone: '123', address: 'x' });
    expect(() => selfUpdateSchema.parse({ job_title: 'nope' })).toThrow();
    expect(() => selfUpdateSchema.parse({ salary: '1' })).toThrow();
  });

  it('admin update: allows job and sensitive fields, still no unknown keys', () => {
    expect(adminUpdateSchema.parse({ job_title: 'Lead', salary: '9' })).toMatchObject({ job_title: 'Lead', salary: '9' });
    expect(() => adminUpdateSchema.parse({ hacker: true })).toThrow();
  });

  it('status change: only active or inactive', () => {
    expect(statusChangeSchema.parse({ status: 'inactive' })).toMatchObject({ status: 'inactive' });
    expect(() => statusChangeSchema.parse({ status: 'deleted' })).toThrow();
  });

  it('list query: defaults pagination, caps limit, validates filters', () => {
    expect(listQuerySchema.parse({})).toMatchObject({ page: 1, limit: 20 });
    expect(listQuerySchema.parse({ page: '2', limit: '50' })).toMatchObject({ page: 2, limit: 50 });
    expect(() => listQuerySchema.parse({ limit: '101' })).toThrow();
    expect(() => listQuerySchema.parse({ status: 'weird' })).toThrow();
  });
});
