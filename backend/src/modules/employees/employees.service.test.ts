import * as repo from './employees.repository.js';
import * as service from './employees.service.js';
import { ApiError } from '../../middleware/errorHandler.js';
import { encryptField, decryptFields } from './employees.crypto.js';

jest.mock('./employees.repository.js');
const mockRepo = repo as jest.Mocked<typeof repo>;

jest.mock('../../config/db.js', () => ({
  withTransaction: (fn: (client: unknown) => Promise<unknown>) => fn({ query: jest.fn() }),
}));

process.env.ENCRYPTION_KEY = 'test-encryption-key-0123456789abcdef0123456789abcdef';

const hr = { id: 'hr-1', email: 'hr@x.co', roles: ['hr' as const] };
const admin = { id: 'ad-1', email: 'admin@x.co', roles: ['admin' as const] };
const manager = { id: 'mg-1', email: 'mg@x.co', roles: ['manager' as const] };
const employee = { id: 'em-1', email: 'em@x.co', roles: ['employee' as const] };

const baseRow = (overrides: Partial<repo.EmployeeRow> = {}): repo.EmployeeRow => ({
  id: 'e1',
  user_id: 'em-1',
  first_name: 'Asha',
  last_name: 'Rao',
  email: 'asha@example.com',
  phone: '9876543210',
  address: null,
  job_title: 'Engineer',
  department_id: null,
  manager_id: null,
  date_of_birth: null,
  join_date: '2024-01-15',
  employment_status: 'active',
  salary_encrypted: encryptField('850000'),
  bank_details_encrypted: encryptField(JSON.stringify(['1234567890', 'HDFC'])),
  national_id_encrypted: encryptField('XXXX1234'),
  created_at: new Date(),
  updated_at: new Date(),
  ...overrides,
});

const createInput = {
  first_name: 'Ravi',
  last_name: 'Kumar',
  email: 'ravi@example.com',
  salary: '600000',
  bank_account: '1111222233',
  bank_name: 'ICICI',
};

beforeEach(() => {
  jest.clearAllMocks();
});

describe('createEmployee', () => {
  it('creates an employee (HR/Admin only) and encrypts sensitive fields', async () => {
    mockRepo.emailExists.mockResolvedValue(false);
    mockRepo.insertEmployee.mockImplementation(async (data) => baseRow({ first_name: data.first_name, email: data.email }));
    const result = await service.createEmployee(createInput, hr);
    expect(result.first_name).toBe('Ravi');
    expect(result.salary).toBe('850000'); // detail decrypts for authorized viewer
    const inserted = mockRepo.insertEmployee.mock.calls[0][0];
    expect(inserted.salary_encrypted).toBeInstanceOf(Buffer);
    expect(decryptFields(inserted as never).salary).toBe('600000');
  });

  it('returns 409 on duplicate email', async () => {
    mockRepo.emailExists.mockResolvedValue(true);
    const err = await service.createEmployee(createInput, hr).catch((e) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect(err.status).toBe(409);
    expect(err.code).toBe('EMAIL_TAKEN');
  });

  it('returns 403 for non-HR/Admin roles', async () => {
    const err = await service.createEmployee(createInput, employee).catch((e) => e);
    expect(err.status).toBe(403);
    expect(mockRepo.insertEmployee).not.toHaveBeenCalled();
  });
});

describe('getEmployee (field-level security)', () => {
  it('includes salary and bank details for HR', async () => {
    mockRepo.findEmployeeById.mockResolvedValue(baseRow());
    const detail = (await service.getEmployee('e1', hr)) as Record<string, unknown>;
    expect(detail.salary).toBe('850000');
    expect(detail.bank_account).toBe('1234567890');
    expect(detail.bank_name).toBe('HDFC');
    expect(detail.national_id).toBe('XXXX1234');
  });

  it('includes sensitive fields for the employee themself', async () => {
    mockRepo.findEmployeeById.mockResolvedValue(baseRow());
    const detail = (await service.getEmployee('e1', employee)) as Record<string, unknown>;
    expect(detail.salary).toBe('850000');
  });

  it('omits sensitive fields entirely for manager and other employees', async () => {
    mockRepo.findEmployeeById.mockResolvedValue(baseRow());
    const forManager = (await service.getEmployee('e1', manager)) as Record<string, unknown>;
    expect('salary' in forManager).toBe(false);
    expect('bank_account' in forManager).toBe(false);
    expect('national_id' in forManager).toBe(false);
    const forOther = (await service.getEmployee('e1', { ...employee, id: 'other-user' })) as Record<string, unknown>;
    expect('salary' in forOther).toBe(false);
  });

  it('returns 404 for an unknown id', async () => {
    mockRepo.findEmployeeById.mockResolvedValue(null);
    const err = await service.getEmployee('nope', hr).catch((e) => e);
    expect(err.status).toBe(404);
  });
});

describe('listEmployees (role scoping)', () => {
  it('HR and Admin see everyone', async () => {
    mockRepo.findEmployeeByUserId.mockResolvedValue(baseRow({ user_id: 'hr-1' }));
    mockRepo.listEmployees.mockResolvedValue([baseRow()]);
    mockRepo.countEmployees.mockResolvedValue(1);
    const result = await service.listEmployees(
      { page: 1, limit: 20 },
      hr,
    );
    expect(result.data).toHaveLength(1);
    expect(result.meta.total).toBe(1);
    expect((result.data[0] as Record<string, unknown>).salary).toBeUndefined(); // never in lists
    expect(mockRepo.listEmployees.mock.calls[0][1]).toEqual({});
  });

  it('manager sees only direct reports', async () => {
    mockRepo.findEmployeeByUserId.mockResolvedValue(baseRow({ user_id: 'mg-1', id: 'mg-row' }));
    mockRepo.listEmployees.mockResolvedValue([]);
    mockRepo.countEmployees.mockResolvedValue(0);
    await service.listEmployees({ page: 1, limit: 20 }, manager);
    expect(mockRepo.listEmployees.mock.calls[0][1]).toEqual({ managerId: 'mg-row' });
  });

  it('employee sees only self', async () => {
    mockRepo.findEmployeeByUserId.mockResolvedValue(baseRow({ user_id: 'em-1', id: 'em-row' }));
    mockRepo.listEmployees.mockResolvedValue([]);
    mockRepo.countEmployees.mockResolvedValue(0);
    await service.listEmployees({ page: 1, limit: 20 }, employee);
    expect(mockRepo.listEmployees.mock.calls[0][1]).toEqual({ selfEmployeeId: 'em-row' });
  });

  it('a user with no employee record and no elevated role sees nothing', async () => {
    mockRepo.findEmployeeByUserId.mockResolvedValue(null);
    const result = await service.listEmployees({ page: 1, limit: 20 }, { ...employee, id: 'ghost' });
    expect(result.data).toEqual([]);
    expect(result.meta.total).toBe(0);
    expect(mockRepo.listEmployees).not.toHaveBeenCalled();
  });

  it('passes search, filters, and pagination to the repository', async () => {
    mockRepo.findEmployeeByUserId.mockResolvedValue(null);
    mockRepo.listEmployees.mockResolvedValue([]);
    mockRepo.countEmployees.mockResolvedValue(0);
    await service.listEmployees(
      { search: 'asha', department: 'd1', status: 'active', page: 2, limit: 10 },
      admin,
    );
    const filters = mockRepo.listEmployees.mock.calls[0][0];
    expect(filters).toMatchObject({ search: 'asha', department: 'd1', status: 'active', limit: 10, offset: 10 });
  });
});

describe('updateEmployee', () => {
  it('HR/Admin update any field, including re-encrypted sensitive ones', async () => {
    mockRepo.findEmployeeById.mockResolvedValue(baseRow());
    mockRepo.updateEmployeeFields.mockResolvedValue(baseRow({ job_title: 'Senior Engineer' }));
    const result = await service.updateEmployee(
      'e1',
      { job_title: 'Senior Engineer', salary: '900000' },
      hr,
    );
    expect(result.job_title).toBe('Senior Engineer');
    const [id, fields, encrypted] = mockRepo.updateEmployeeFields.mock.calls[0];
    expect(id).toBe('e1');
    expect(fields).toMatchObject({ job_title: 'Senior Engineer' });
    expect(encrypted?.salary_encrypted).toBeInstanceOf(Buffer);
  });

  it('employee self-update is limited to contact fields', async () => {
    mockRepo.findEmployeeById.mockResolvedValue(baseRow());
    mockRepo.updateEmployeeFields.mockResolvedValue(baseRow({ phone: '9000000000' }));
    await service.updateEmployee('e1', { phone: '9000000000', address: 'New Town' }, employee);
    const [id, fields] = mockRepo.updateEmployeeFields.mock.calls[0];
    expect(id).toBe('e1');
    expect(Object.keys(fields).sort()).toEqual(['address', 'phone']);
  });

  it('employee cannot update someone else', async () => {
    mockRepo.findEmployeeById.mockResolvedValue(baseRow({ user_id: 'someone-else' }));
    const err = await service.updateEmployee('e1', { phone: '1' }, employee).catch((e) => e);
    expect(err.status).toBe(403);
  });

  it('returns 404 for an unknown employee', async () => {
    mockRepo.findEmployeeById.mockResolvedValue(null);
    const err = await service.updateEmployee('nope', { phone: '1' }, hr).catch((e) => e);
    expect(err.status).toBe(404);
  });
});

describe('setEmployeeStatus', () => {
  it('deactivates and reactivates (HR/Admin only)', async () => {
    mockRepo.findEmployeeById.mockResolvedValue(baseRow());
    mockRepo.setEmployeeStatus.mockResolvedValue(baseRow({ employment_status: 'inactive' }));
    const result = await service.setEmployeeStatus('e1', 'inactive', admin);
    expect(result.status).toBe('inactive');
    expect(mockRepo.setEmployeeStatus).toHaveBeenCalledWith('e1', 'inactive');

    mockRepo.setEmployeeStatus.mockResolvedValue(baseRow());
    const reactivated = await service.setEmployeeStatus('e1', 'active', admin);
    expect(reactivated.status).toBe('active');
  });

  it('returns 403 for non-HR/Admin', async () => {
    const err = await service.setEmployeeStatus('e1', 'inactive', manager).catch((e) => e);
    expect(err.status).toBe(403);
    expect(mockRepo.setEmployeeStatus).not.toHaveBeenCalled();
  });

  it('returns 404 for an unknown employee', async () => {
    mockRepo.findEmployeeById.mockResolvedValue(null);
    const err = await service.setEmployeeStatus('nope', 'inactive', admin).catch((e) => e);
    expect(err.status).toBe(404);
  });
});
