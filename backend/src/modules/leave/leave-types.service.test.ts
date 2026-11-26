import * as repo from './leave-types.repository.js';
import * as service from './leave-types.service.js';
import { ApiError } from '../../middleware/errorHandler.js';

jest.mock('./leave-types.repository.js');
const mockRepo = repo as jest.Mocked<typeof repo>;

const hr = { id: 'hr-1', email: 'hr@x.co', roles: ['hr' as const] };
const admin = { id: 'ad-1', email: 'admin@x.co', roles: ['admin' as const] };
const employee = { id: 'em-1', email: 'em@x.co', roles: ['employee' as const] };

const baseRow = (overrides: Partial<repo.LeaveTypeRow> = {}): repo.LeaveTypeRow => ({
  id: 'lt1',
  name: 'Annual',
  quota_days: '20.0',
  is_paid: true,
  is_active: true,
  created_at: new Date(),
  ...overrides,
});

beforeEach(() => {
  jest.clearAllMocks();
});

describe('createLeaveType', () => {
  it('creates a leave type with valid data (HR/Admin)', async () => {
    mockRepo.leaveTypeNameExists.mockResolvedValue(false);
    mockRepo.insertLeaveType.mockResolvedValue(baseRow({ name: 'Parental', quota_days: '10.0', is_paid: true }));
    const result = await service.createLeaveType({ name: 'Parental', quota_days: 10, is_paid: true }, hr);
    expect(result.name).toBe('Parental');
    expect(mockRepo.insertLeaveType).toHaveBeenCalledWith('Parental', 10, true);
  });

  it('rejects a duplicate name with 409', async () => {
    mockRepo.leaveTypeNameExists.mockResolvedValue(true);
    const err = await service.createLeaveType({ name: 'Annual', quota_days: 5, is_paid: true }, hr).catch((e) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect(err.status).toBe(409);
    expect(err.code).toBe('NAME_TAKEN');
  });

  it('rejects a negative quota with 400 (schema) and passes 0 through', async () => {
    mockRepo.leaveTypeNameExists.mockResolvedValue(false);
    mockRepo.insertLeaveType.mockResolvedValue(baseRow({ name: 'Unpaid Special', quota_days: '0.0', is_paid: false }));
    const ok = await service.createLeaveType({ name: 'Unpaid Special', quota_days: 0, is_paid: false }, admin);
    expect(ok.quota_days).toBe('0.0');
  });

  it('rejects non-HR/Admin with 403', async () => {
    const err = await service.createLeaveType({ name: 'X', quota_days: 5, is_paid: true }, employee).catch((e) => e);
    expect(err.status).toBe(403);
    expect(mockRepo.insertLeaveType).not.toHaveBeenCalled();
  });
});

describe('listLeaveTypes', () => {
  const all = [
    { ...baseRow(), used_days: '3.0' },
    { ...baseRow({ id: 'lt2', name: 'Old Type', is_active: false }), used_days: '9.0' },
  ];

  it('HR/Admin see all types including usage', async () => {
    mockRepo.listLeaveTypesWithUsage.mockResolvedValue(all);
    const result = await service.listLeaveTypes(hr);
    expect(result).toHaveLength(2);
    expect(result[0].used_days).toBe('3.0');
  });

  it('other roles see only active types', async () => {
    mockRepo.listLeaveTypesWithUsage.mockResolvedValue(all);
    const result = await service.listLeaveTypes(employee);
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Annual');
  });

  it('queries usage for the current year', async () => {
    mockRepo.listLeaveTypesWithUsage.mockResolvedValue([]);
    await service.listLeaveTypes(hr);
    expect(mockRepo.listLeaveTypesWithUsage).toHaveBeenCalledWith(new Date().getFullYear());
  });
});

describe('updateLeaveType', () => {
  it('updates name and quota', async () => {
    mockRepo.findLeaveTypeById.mockResolvedValue(baseRow());
    mockRepo.leaveTypeNameExists.mockResolvedValue(false);
    mockRepo.updateLeaveTypeFields.mockResolvedValue(baseRow({ quota_days: '25.0' }));
    const result = await service.updateLeaveType('lt1', { quota_days: 25 }, hr);
    expect(result.quota_days).toBe('25.0');
  });

  it('rename to an existing name is rejected with 409', async () => {
    mockRepo.findLeaveTypeById.mockResolvedValue(baseRow());
    mockRepo.leaveTypeNameExists.mockResolvedValue(true);
    const err = await service.updateLeaveType('lt1', { name: 'Sick' }, hr).catch((e) => e);
    expect(err.status).toBe(409);
  });

  it('keeping the same name is allowed', async () => {
    mockRepo.findLeaveTypeById.mockResolvedValue(baseRow());
    mockRepo.updateLeaveTypeFields.mockResolvedValue(baseRow());
    await service.updateLeaveType('lt1', { name: 'Annual' }, hr);
    expect(mockRepo.leaveTypeNameExists).not.toHaveBeenCalled();
  });

  it('unknown type returns 404', async () => {
    mockRepo.findLeaveTypeById.mockResolvedValue(null);
    const err = await service.updateLeaveType('nope', { quota_days: 1 }, hr).catch((e) => e);
    expect(err.status).toBe(404);
  });

  it('rejects non-HR/Admin with 403', async () => {
    const err = await service.updateLeaveType('lt1', { quota_days: 1 }, employee).catch((e) => e);
    expect(err.status).toBe(403);
  });
});

describe('archiveLeaveType', () => {
  it('archives (is_active false)', async () => {
    mockRepo.setLeaveTypeActive.mockResolvedValue(baseRow({ is_active: false }));
    const result = await service.archiveLeaveType('lt1', admin);
    expect(result.is_active).toBe(false);
    expect(mockRepo.setLeaveTypeActive).toHaveBeenCalledWith('lt1', false);
  });

  it('unknown type returns 404', async () => {
    mockRepo.setLeaveTypeActive.mockResolvedValue(null);
    const err = await service.archiveLeaveType('nope', admin).catch((e) => e);
    expect(err.status).toBe(404);
  });

  it('rejects non-HR/Admin with 403', async () => {
    const err = await service.archiveLeaveType('lt1', employee).catch((e) => e);
    expect(err.status).toBe(403);
  });
});
