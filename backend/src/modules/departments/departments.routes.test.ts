import request from 'supertest';
import jwt from 'jsonwebtoken';
import { createApp } from '../../app.js';
import { ApiError } from '../../middleware/errorHandler.js';
import * as service from './departments.service.js';

jest.mock('./departments.service.js', () => ({
  ...jest.requireActual('./departments.service.js'),
  createDepartment: jest.fn(),
  getDepartment: jest.fn(),
  listDepartments: jest.fn(),
  updateDepartment: jest.fn(),
  assignHead: jest.fn(),
  archiveDepartment: jest.fn(),
}));

const mockService = service as jest.Mocked<typeof service>;
const SECRET = process.env.JWT_SECRET as string;

function tokenFor(roles: string[]): string {
  return jwt.sign({ sub: 'u1', email: 'u1@x.co', roles }, SECRET, { algorithm: 'HS256' });
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('departments routes', () => {
  it('POST / returns 201 for HR', async () => {
    (mockService.createDepartment as jest.Mock).mockResolvedValue({ id: 'd1', name: 'Sales' });
    const res = await request(createApp())
      .post('/api/departments')
      .set('Authorization', `Bearer ${tokenFor(['hr'])}`)
      .send({ name: 'Sales' });
    expect(res.status).toBe(201);
    expect(res.body.data.name).toBe('Sales');
  });

  it('POST / returns 403 for employee and manager', async () => {
    for (const role of ['employee', 'manager']) {
      const res = await request(createApp())
        .post('/api/departments')
        .set('Authorization', `Bearer ${tokenFor([role])}`)
        .send({ name: 'Sales' });
      expect(res.status).toBe(403);
    }
  });

  it('POST / returns 401 without a token', async () => {
    const res = await request(createApp()).post('/api/departments').send({ name: 'Sales' });
    expect(res.status).toBe(401);
  });

  it('POST / returns 400 for an invalid body', async () => {
    const res = await request(createApp())
      .post('/api/departments')
      .set('Authorization', `Bearer ${tokenFor(['hr'])}`)
      .send({});
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('GET / returns the scoped list', async () => {
    (mockService.listDepartments as jest.Mock).mockResolvedValue([]);
    const res = await request(createApp())
      .get('/api/departments')
      .set('Authorization', `Bearer ${tokenFor(['employee'])}`);
    expect(res.status).toBe(200);
    expect(mockService.listDepartments).toHaveBeenCalled();
  });

  it('PATCH /:id/head passes through for admin', async () => {
    (mockService.assignHead as jest.Mock).mockResolvedValue({ id: 'd1', head_employee_id: 'e9' });
    const res = await request(createApp())
      .patch('/api/departments/d1/head')
      .set('Authorization', `Bearer ${tokenFor(['admin'])}`)
      .send({ employee_id: '0e8d7f8a-1111-2222-3333-444455556666' });
    expect(res.status).toBe(200);
  });

  it('PATCH /:id/archive returns 403 for employee', async () => {
    const res = await request(createApp())
      .patch('/api/departments/d1/archive')
      .set('Authorization', `Bearer ${tokenFor(['employee'])}`);
    expect(res.status).toBe(403);
  });

  it('maps a 409 service error into the standard shape', async () => {
    (mockService.createDepartment as jest.Mock).mockRejectedValue(
      new ApiError(409, 'A department with this name already exists', 'NAME_TAKEN'),
    );
    const res = await request(createApp())
      .post('/api/departments')
      .set('Authorization', `Bearer ${tokenFor(['hr'])}`)
      .send({ name: 'Sales' });
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('NAME_TAKEN');
    expect(res.body.error.requestId).toBeDefined();
  });
});
