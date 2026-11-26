import { createDepartmentSchema, updateDepartmentSchema, assignHeadSchema } from './departments.schema.js';

describe('departments schemas', () => {
  it('create: accepts name + optional description; rejects empty name and unknown keys', () => {
    expect(createDepartmentSchema.parse({ name: ' Sales ' })).toMatchObject({ name: 'Sales' });
    expect(() => createDepartmentSchema.parse({ name: '' })).toThrow(/Name is required/);
    expect(() => createDepartmentSchema.parse({ name: 'X', hacker: true })).toThrow();
  });

  it('update: all fields optional, no unknown keys', () => {
    expect(updateDepartmentSchema.parse({})).toMatchObject({});
    expect(() => updateDepartmentSchema.parse({ head_employee_id: 'x' })).toThrow();
  });

  it('assignHead: requires a valid employee UUID', () => {
    expect(assignHeadSchema.parse({ employee_id: '0e8d7f8a-1111-2222-3333-444455556666' })).toMatchObject({
      employee_id: '0e8d7f8a-1111-2222-3333-444455556666',
    });
    expect(() => assignHeadSchema.parse({ employee_id: 'not-a-uuid' })).toThrow(/Invalid employee/);
    expect(() => assignHeadSchema.parse({})).toThrow();
  });
});
