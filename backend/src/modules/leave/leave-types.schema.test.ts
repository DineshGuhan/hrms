import { createLeaveTypeSchema, updateLeaveTypeSchema } from './leave-types.schema.js';

describe('leave type schemas', () => {
  it('create: accepts a valid type and defaults is_paid to true', () => {
    const parsed = createLeaveTypeSchema.parse({ name: ' Annual ', quota_days: '20' });
    expect(parsed.name).toBe('Annual');
    expect(parsed.is_paid).toBe(true);
  });

  it('create: rejects empty names and negative quotas', () => {
    expect(() => createLeaveTypeSchema.parse({ name: '', quota_days: 5 })).toThrow(/Name is required/);
    expect(() => createLeaveTypeSchema.parse({ name: 'X', quota_days: -1 })).toThrow();
    expect(() => createLeaveTypeSchema.parse({ quota_days: 5 })).toThrow();
  });

  it('create: rejects absurdly large quotas (> 366 days)', () => {
    expect(() => createLeaveTypeSchema.parse({ name: 'X', quota_days: 400 })).toThrow();
  });

  it('update: all fields optional, no unknown keys', () => {
    expect(updateLeaveTypeSchema.parse({})).toMatchObject({});
    expect(() => updateLeaveTypeSchema.parse({ hacker: true })).toThrow();
  });
});
