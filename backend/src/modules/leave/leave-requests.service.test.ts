import * as repo from './leave-requests.repository.js';
import * as leaveTypesRepo from './leave-types.repository.js';
import * as service from './leave-requests.service.js';
import { countWorkingDays } from './leave-requests.service.js';
import { ApiError } from '../../middleware/errorHandler.js';

jest.mock('./leave-requests.repository.js');
jest.mock('./leave-types.repository.js');
const mockRepo = repo as jest.Mocked<typeof repo>;
const mockLeaveTypesRepo = leaveTypesRepo as jest.Mocked<typeof leaveTypesRepo>;

jest.mock('../../config/db.js', () => ({
  withTransaction: (fn: (client: unknown) => Promise<unknown>) => fn({ query: jest.fn() }),
}));

const employee = { id: 'em-1', email: 'em@x.co', roles: ['employee' as const] };
const PAID_TYPE = '11111111-1111-1111-1111-111111111111';
const UNPAID_TYPE = '22222222-2222-2222-2222-222222222222';

const input = (overrides: Partial<{ leave_type_id: string; start_date: string; end_date: string; reason: string }> = {}) => ({
  leave_type_id: PAID_TYPE,
  start_date: '2030-06-03', // Monday
  end_date: '2030-06-07', // Friday
  reason: 'Family event',
  ...overrides,
});

const typeRow = (overrides: Partial<repo.LeaveTypeRow> = {}) => ({
  id: PAID_TYPE,
  name: 'Annual',
  quota_days: '20.0',
  is_paid: true,
  is_active: true,
  created_at: new Date(),
  ...overrides,
});

const unpaidTypeRow = (overrides: Partial<repo.LeaveTypeRow> = {}) => ({
  id: UNPAID_TYPE,
  name: 'Unpaid',
  quota_days: '0.0',
  is_paid: false,
  is_active: true,
  created_at: new Date(),
  ...overrides,
});

beforeEach(() => {
  jest.clearAllMocks();
  mockRepo.findEmployeeIdByUserId.mockResolvedValue('e1');
  mockLeaveTypesRepo.findLeaveTypeById.mockResolvedValue(typeRow());
  mockRepo.findOverlappingRequest.mockResolvedValue(null);
  mockRepo.insertLeaveRequest.mockImplementation(async (data) => ({
    id: 'lr1',
    employee_id: data.employee_id,
    leave_type_id: data.leave_type_id,
    leave_type_name: null,
    start_date: data.start_date,
    end_date: data.end_date,
    days: String(data.days),
    reason: data.reason,
    status: 'pending',
    approver_id: null,
    approver_comment: null,
    decided_at: null,
    created_at: new Date(),
    updated_at: new Date(),
  }));
  mockRepo.getLeaveBalances.mockResolvedValue([
    { leave_type_id: PAID_TYPE, name: 'Annual', is_paid: true, quota_days: '20.0', used_days: '5.0' },
    { leave_type_id: UNPAID_TYPE, name: 'Unpaid', is_paid: false, quota_days: '0.0', used_days: '0.0' },
  ]);
});

describe('countWorkingDays', () => {
  it('excludes weekends from the count', () => {
    // Mon 2030-06-03 to Sun 2030-06-09 = 5 working days, 2 weekend days
    const result = countWorkingDays('2030-06-03', '2030-06-09');
    expect(result.workingDays).toBe(5);
    expect(result.weekends).toBe(2);
  });

  it('counts a single working day', () => {
    expect(countWorkingDays('2030-06-05', '2030-06-05').workingDays).toBe(1);
  });

  it('returns 0 working days for a full-weekend range', () => {
    expect(countWorkingDays('2030-06-08', '2030-06-09').workingDays).toBe(0);
  });
});

describe('createLeaveRequest', () => {
  it('creates a request with the working-day count', async () => {
    const result = await service.createLeaveRequest(input(), employee);
    expect(result.days).toBe('5');
    expect(mockRepo.insertLeaveRequest).toHaveBeenCalledWith(
      expect.objectContaining({ employee_id: 'e1', days: 5, reason: 'Family event' }),
      expect.anything(),
    );
  });

  it('rejects end before start (422 via schema, service double-checks)', async () => {
    const err = await service
      .createLeaveRequest(input({ end_date: '2030-06-01' }), employee)
      .catch((e) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect(err.status).toBe(422);
  });

  it('rejects a past start date with 422', async () => {
    const err = await service
      .createLeaveRequest(input({ start_date: '2020-01-01', end_date: '2020-01-02' }), employee)
      .catch((e) => e);
    expect(err.status).toBe(422);
    expect(err.code).toBe('PAST_START_DATE');
  });

  it('rejects an overlapping pending/approved request with 409', async () => {
    mockRepo.findOverlappingRequest.mockResolvedValue({ id: 'lr-existing' } as repo.LeaveRequestRow);
    const err = await service.createLeaveRequest(input(), employee).catch((e) => e);
    expect(err.status).toBe(409);
    expect(err.code).toBe('OVERLAP');
    expect(mockRepo.insertLeaveRequest).not.toHaveBeenCalled();
  });

  it('rejects when the balance is exceeded with 422', async () => {
    mockRepo.getLeaveBalances.mockResolvedValue([
      { leave_type_id: PAID_TYPE, name: 'Annual', is_paid: true, quota_days: '20.0', used_days: '18.0' },
    ]);
    // Mon-Fri = 5 days but only 2 remain.
    const err = await service.createLeaveRequest(input(), employee).catch((e) => e);
    expect(err.status).toBe(422);
    expect(err.code).toBe('INSUFFICIENT_BALANCE');
    expect(mockRepo.insertLeaveRequest).not.toHaveBeenCalled();
  });

  it('unpaid leave skips the balance check', async () => {
    mockLeaveTypesRepo.findLeaveTypeById.mockResolvedValue(unpaidTypeRow());
    mockRepo.getLeaveBalances.mockResolvedValue([
      { leave_type_id: UNPAID_TYPE, name: 'Unpaid', is_paid: false, quota_days: '0.0', used_days: '0.0' },
    ]);
    const result = await service.createLeaveRequest(input({ leave_type_id: UNPAID_TYPE }), employee);
    expect(result.status).toBe('pending');
  });

  it('rejects an inactive leave type with 422', async () => {
    mockLeaveTypesRepo.findLeaveTypeById.mockResolvedValue(typeRow({ is_active: false }));
    const err = await service.createLeaveRequest(input(), employee).catch((e) => e);
    expect(err.status).toBe(422);
    expect(err.code).toBe('INVALID_LEAVE_TYPE');
  });
});

describe('cancelLeaveRequest', () => {
  const pending = {
    id: 'lr1',
    employee_id: 'e1',
    leave_type_id: PAID_TYPE,
    leave_type_name: null,
    start_date: '2030-06-03',
    end_date: '2030-06-07',
    days: '5',
    reason: null,
    status: 'pending',
    approver_id: null,
    approver_comment: null,
    decided_at: null,
    created_at: new Date(),
    updated_at: new Date(),
  };

  it('cancels a pending request owned by the caller', async () => {
    mockRepo.findLeaveRequestById.mockResolvedValue(pending);
    mockRepo.cancelPendingRequest.mockResolvedValue({ ...pending, status: 'cancelled' });
    const result = await service.cancelLeaveRequest('lr1', employee);
    expect(result.status).toBe('cancelled');
    expect(mockRepo.cancelPendingRequest).toHaveBeenCalledWith('lr1', 'e1');
  });

  it('forbids cancelling someone else’s request', async () => {
    mockRepo.findLeaveRequestById.mockResolvedValue(pending);
    mockRepo.findEmployeeIdByUserId.mockResolvedValue('e1'); // caller is the owner in the DB lookup sense
    // The service compares the *request's* employee with the resolved self id.
    mockRepo.findLeaveRequestById.mockResolvedValue({ ...pending, employee_id: 'someone-else' });
    const err = await service.cancelLeaveRequest('lr1', { ...employee, id: 'other' }).catch((e) => e);
    expect(err.status).toBe(403);
  });

  it('rejects cancelling a decided request with 409', async () => {
    mockRepo.findLeaveRequestById.mockResolvedValue({ ...pending, status: 'approved' });
    const err = await service.cancelLeaveRequest('lr1', employee).catch((e) => e);
    expect(err.status).toBe(409);
  });

  it('unknown request returns 404', async () => {
    mockRepo.findLeaveRequestById.mockResolvedValue(null);
    const err = await service.cancelLeaveRequest('nope', employee).catch((e) => e);
    expect(err.status).toBe(404);
  });
});

describe('balances and listing', () => {
  it('returns remaining days per type', async () => {
    mockRepo.findEmployeeIdByUserId.mockResolvedValue('e1');
    mockRepo.getLeaveBalances.mockResolvedValue([
      { leave_type_id: PAID_TYPE, name: 'Annual', is_paid: true, quota_days: '20.0', used_days: '5.0' },
    ]);
    const balances = await service.getLeaveBalancesForViewer(employee);
    expect(balances[0]).toMatchObject({ name: 'Annual', quota_days: 20, used_days: 5, remaining_days: 15 });
  });

  it('lists the caller’s requests', async () => {
    mockRepo.findEmployeeIdByUserId.mockResolvedValue('e1');
    mockRepo.listMyLeaveRequests.mockResolvedValue([
      { id: 'lr1', employee_id: 'e1', leave_type_id: PAID_TYPE, leave_type_name: 'Annual', start_date: '2030-06-03', end_date: '2030-06-07', days: '5', reason: null, status: 'pending', approver_id: null, approver_comment: null, decided_at: null, created_at: new Date(), updated_at: new Date() },
    ]);
    const rows = await service.listMyLeaveRequests(employee);
    expect(rows).toHaveLength(1);
    expect(rows[0].leave_type_name).toBe('Annual');
  });
});
