import * as repo from './departments.repository.js';
import * as service from './departments.service.js';
import { ApiError } from '../../middleware/errorHandler.js';

jest.mock('./departments.repository.js');
const mockRepo = repo as jest.Mocked<typeof repo>;

const hr = { id: 'hr-1', email: 'hr@x.co', roles: ['hr' as const] };
const admin = { id: 'ad-1', email: 'admin@x.co', roles: ['admin' as const] };
const manager = { id: 'mg-1', email: 'mg@x.co', roles: ['manager' as const] };
const employee = { id: 'em-1', email: 'em@x.co', roles: ['employee' as const] };

const baseRow = (overrides: Partial<repo.DepartmentRow> = {}): repo.DepartmentRow => ({
  id: 'd1',
  name: 'Engineering',
  description: null,
  parent_id: null,
  head_employee_id: null,
  status: 'active',
  created_at: new Date(),
  updated_at: new Date(),
  ...overrides,
});

beforeEach(() => {
  jest.clearAllMocks();
});

describe('createDepartment', () => {
  it('creates a department with valid data', async () => {
    mockRepo.nameExists.mockResolvedValue(false);
    mockRepo.insertDepartment.mockResolvedValue(baseRow());
    const result = await service.createDepartment({ name: 'Engineering' }, hr);
    expect(result.name).toBe('Engineering');
    expect(mockRepo.insertDepartment).toHaveBeenCalledWith('Engineering', null);
  });

  it('rejects a duplicate name with 409', async () => {
    mockRepo.nameExists.mockResolvedValue(true);
    const err = await service.createDepartment({ name: 'Engineering' }, hr).catch((e) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect(err.status).toBe(409);
    expect(err.code).toBe('NAME_TAKEN');
  });

  it('rejects a non-HR/Admin role with 403', async () => {
    const err = await service.createDepartment({ name: 'X' }, employee).catch((e) => e);
    expect(err.status).toBe(403);
    expect(mockRepo.insertDepartment).not.toHaveBeenCalled();
  });
});

describe('listDepartments', () => {
  const all = [
    { ...baseRow(), employee_count: 5, head_name: 'Asha Rao' },
    { ...baseRow({ id: 'd2', name: 'Archived Dept', status: 'archived' }), employee_count: 2, head_name: null },
  ];

  it('HR/Admin get all departments with counts and head names', async () => {
    mockRepo.listDepartments.mockResolvedValue(all);
    const result = await service.listDepartments(admin);
    expect(result).toHaveLength(2);
    expect(result[0]).toMatchObject({ employee_count: 5, head_name: 'Asha Rao' });
  });

  it('other roles get active-only lightweight rows for selects', async () => {
    mockRepo.listDepartments.mockResolvedValue(all);
    const result = await service.listDepartments(employee);
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ id: 'd1', name: 'Engineering' });
    expect('description' in result[0]).toBe(false);
    expect('status' in result[0]).toBe(false);
  });
});

describe('updateDepartment', () => {
  it('updates name and description', async () => {
    mockRepo.findDepartmentById.mockResolvedValue(baseRow());
    mockRepo.nameExists.mockResolvedValue(false);
    mockRepo.updateDepartmentFields.mockResolvedValue(baseRow({ description: 'Product engineering' }));
    const result = await service.updateDepartment('d1', { description: 'Product engineering' }, hr);
    expect(result.description).toBe('Product engineering');
  });

  it('rename to an existing name is rejected with 409', async () => {
    mockRepo.findDepartmentById.mockResolvedValue(baseRow());
    mockRepo.nameExists.mockResolvedValue(true);
    const err = await service.updateDepartment('d1', { name: 'Sales' }, hr).catch((e) => e);
    expect(err.status).toBe(409);
  });

  it('keeping the same name is allowed (no 409)', async () => {
    mockRepo.findDepartmentById.mockResolvedValue(baseRow());
    mockRepo.updateDepartmentFields.mockResolvedValue(baseRow());
    await service.updateDepartment('d1', { name: 'Engineering' }, hr);
    expect(mockRepo.nameExists).not.toHaveBeenCalled();
  });

  it('unknown department returns 404', async () => {
    mockRepo.findDepartmentById.mockResolvedValue(null);
    const err = await service.updateDepartment('nope', { name: 'X' }, hr).catch((e) => e);
    expect(err.status).toBe(404);
  });
});

describe('assignHead', () => {
  it('assigns an active employee as head', async () => {
    mockRepo.findDepartmentById.mockResolvedValue(baseRow());
    mockRepo.findEmployeeHeadCandidate.mockResolvedValue({ id: 'e9', status: 'active' });
    mockRepo.setDepartmentHead.mockResolvedValue(baseRow({ head_employee_id: 'e9' }));
    const result = await service.assignHead('d1', { employee_id: 'e9' }, hr);
    expect(result.head_employee_id).toBe('e9');
  });

  it('rejects an inactive employee with 400', async () => {
    mockRepo.findDepartmentById.mockResolvedValue(baseRow());
    mockRepo.findEmployeeHeadCandidate.mockResolvedValue({ id: 'e9', status: 'inactive' });
    const err = await service.assignHead('d1', { employee_id: 'e9' }, hr).catch((e) => e);
    expect(err.status).toBe(400);
    expect(err.code).toBe('INVALID_HEAD');
  });

  it('rejects an unknown employee with 404', async () => {
    mockRepo.findDepartmentById.mockResolvedValue(baseRow());
    mockRepo.findEmployeeHeadCandidate.mockResolvedValue(null);
    const err = await service.assignHead('d1', { employee_id: 'nope' }, hr).catch((e) => e);
    expect(err.status).toBe(404);
  });

  it('unknown department returns 404', async () => {
    mockRepo.findDepartmentById.mockResolvedValue(null);
    const err = await service.assignHead('nope', { employee_id: 'e9' }, hr).catch((e) => e);
    expect(err.status).toBe(404);
  });
});

describe('archiveDepartment', () => {
  it('sets status to archived', async () => {
    mockRepo.setDepartmentStatus.mockResolvedValue(baseRow({ status: 'archived' }));
    const result = await service.archiveDepartment('d1', admin);
    expect(result.status).toBe('archived');
    expect(mockRepo.setDepartmentStatus).toHaveBeenCalledWith('d1', 'archived');
  });

  it('unknown department returns 404', async () => {
    mockRepo.setDepartmentStatus.mockResolvedValue(null);
    const err = await service.archiveDepartment('nope', admin).catch((e) => e);
    expect(err.status).toBe(404);
  });

  it('rejects non-HR/Admin with 403 (manager too)', async () => {
    const err = await service.archiveDepartment('d1', manager).catch((e) => e);
    expect(err.status).toBe(403);
    expect(mockRepo.setDepartmentStatus).not.toHaveBeenCalled();
  });
});
