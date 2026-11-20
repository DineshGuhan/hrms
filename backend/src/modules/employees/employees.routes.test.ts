import request from 'supertest';
import jwt from 'jsonwebtoken';
import { createApp } from '../../app.js';
import { ApiError } from '../../middleware/errorHandler.js';
import * as service from './employees.service.js';

jest.mock('./employees.service.js', () => ({
  ...jest.requireActual('./employees.service.js'),
  createEmployee: jest.fn(),
  getEmployee: jest.fn(),
  listEmployees: jest.fn(),
  updateEmployee: jest.fn(),
  setEmployeeStatus: jest.fn(),
}));

const mockService = service as jest.Mocked<typeof service>;

const SECRET = process.env.JWT_SECRET as string;

function tokenFor(roles: string[]): string {
  return jwt.sign({ sub: 'u1', email: 'u1@x.co', roles }, SECRET, { algorithm: 'HS256' });
}

const employeeBody = {
  first_name: 'Ravi',
  last_name: 'Kumar',
  email: 'ravi@example.com',
};

beforeEach(() => {
  jest.clearAllMocks();
});

describe('employees routes', () => {
  it('POST /api/employees returns 201 for HR', async () => {
    (mockService.createEmployee as jest.Mock).mockResolvedValue({ id: 'e1' });
    const res = await request(createApp())
      .post('/api/employees')
      .set('Authorization', `Bearer ${tokenFor(['hr'])}`)
      .send(employeeBody);
    expect(res.status).toBe(201);
    expect(res.body.data.id).toBe('e1');
  });

  it('POST /api/employees returns 403 for employee role', async () => {
    const res = await request(createApp())
      .post('/api/employees')
      .set('Authorization', `Bearer ${tokenFor(['employee'])}`)
      .send(employeeBody);
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
  });

  it('POST /api/employees returns 401 without a token', async () => {
    const res = await request(createApp()).post('/api/employees').send(employeeBody);
    expect(res.status).toBe(401);
  });

  it('POST /api/employees returns 400 for an invalid body', async () => {
    const res = await request(createApp())
      .post('/api/employees')
      .set('Authorization', `Bearer ${tokenFor(['hr'])}`)
      .send({ first_name: '' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('GET /api/employees returns the paginated list', async () => {
    (mockService.listEmployees as jest.Mock).mockResolvedValue({
      data: [],
      meta: { page: 1, limit: 20, total: 0, totalPages: 0 },
    });
    const res = await request(createApp())
      .get('/api/employees?page=2&limit=10&search=asha')
      .set('Authorization', `Bearer ${tokenFor(['hr'])}`);
    expect(res.status).toBe(200);
    expect(mockService.listEmployees).toHaveBeenCalledWith(
      expect.objectContaining({ page: 2, limit: 10, search: 'asha' }),
      expect.objectContaining({ id: 'u1' }),
    );
  });

  it('GET /api/employees/:id returns the detail', async () => {
    (mockService.getEmployee as jest.Mock).mockResolvedValue({ id: 'e1' });
    const res = await request(createApp())
      .get('/api/employees/e1')
      .set('Authorization', `Bearer ${tokenFor(['employee'])}`);
    expect(res.status).toBe(200);
    expect(mockService.getEmployee).toHaveBeenCalledWith('e1', expect.objectContaining({ id: 'u1' }));
  });

  it('PATCH /api/employees/:id passes through to the service', async () => {
    (mockService.updateEmployee as jest.Mock).mockResolvedValue({ id: 'e1', phone: '9' });
    const res = await request(createApp())
      .patch('/api/employees/e1')
      .set('Authorization', `Bearer ${tokenFor(['employee'])}`)
      .send({ phone: '9' });
    expect(res.status).toBe(200);
    expect(mockService.updateEmployee).toHaveBeenCalledWith('e1', { phone: '9' }, expect.anything());
  });

  it('PATCH /api/employees/:id/status returns 403 for manager', async () => {
    const res = await request(createApp())
      .patch('/api/employees/e1/status')
      .set('Authorization', `Bearer ${tokenFor(['manager'])}`)
      .send({ status: 'inactive' });
    expect(res.status).toBe(403);
  });

  it('PATCH /api/employees/:id/status succeeds for admin', async () => {
    (mockService.setEmployeeStatus as jest.Mock).mockResolvedValue({ id: 'e1', status: 'inactive' });
    const res = await request(createApp())
      .patch('/api/employees/e1/status')
      .set('Authorization', `Bearer ${tokenFor(['admin'])}`)
      .send({ status: 'inactive' });
    expect(res.status).toBe(200);
  });

  it('maps a service 409 into the standard error shape', async () => {
    (mockService.createEmployee as jest.Mock).mockRejectedValue(
      new ApiError(409, 'An employee with this email already exists', 'EMAIL_TAKEN'),
    );
    const res = await request(createApp())
      .post('/api/employees')
      .set('Authorization', `Bearer ${tokenFor(['hr'])}`)
      .send(employeeBody);
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('EMAIL_TAKEN');
    expect(res.body.error.requestId).toBeDefined();
  });
});
