import request from 'supertest';
import jwt from 'jsonwebtoken';
import { createApp } from '../../app.js';
import { ApiError } from '../../middleware/errorHandler.js';
import * as service from './leave-types.service.js';

jest.mock('./leave-types.service.js', () => ({
  ...jest.requireActual('./leave-types.service.js'),
  createLeaveType: jest.fn(),
  listLeaveTypes: jest.fn(),
  updateLeaveType: jest.fn(),
  archiveLeaveType: jest.fn(),
}));

const mockService = service as jest.Mocked<typeof service>;
const SECRET = process.env.JWT_SECRET as string;

function tokenFor(roles: string[]): string {
  return jwt.sign({ sub: 'u1', email: 'u1@x.co', roles }, SECRET, { algorithm: 'HS256' });
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('leave types routes', () => {
  it('POST /api/leave-types returns 201 for HR', async () => {
    (mockService.createLeaveType as jest.Mock).mockResolvedValue({ id: 'lt9', name: 'Parental' });
    const res = await request(createApp())
      .post('/api/leave-types')
      .set('Authorization', `Bearer ${tokenFor(['hr'])}`)
      .send({ name: 'Parental', quota_days: 10, is_paid: true });
    expect(res.status).toBe(201);
    expect(res.body.data.name).toBe('Parental');
  });

  it('POST /api/leave-types returns 403 for employee', async () => {
    const res = await request(createApp())
      .post('/api/leave-types')
      .set('Authorization', `Bearer ${tokenFor(['employee'])}`)
      .send({ name: 'X', quota_days: 1 });
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
  });

  it('POST /api/leave-types returns 400 for an invalid body', async () => {
    const res = await request(createApp())
      .post('/api/leave-types')
      .set('Authorization', `Bearer ${tokenFor(['hr'])}`)
      .send({ quota_days: -5 });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('GET /api/leave-types returns the scoped list', async () => {
    (mockService.listLeaveTypes as jest.Mock).mockResolvedValue([]);
    const res = await request(createApp())
      .get('/api/leave-types')
      .set('Authorization', `Bearer ${tokenFor(['employee'])}`);
    expect(res.status).toBe(200);
    expect(mockService.listLeaveTypes).toHaveBeenCalled();
  });

  it('PATCH /:id/archive maps a 404 service error into the standard shape', async () => {
    (mockService.archiveLeaveType as jest.Mock).mockRejectedValue(
      new ApiError(404, 'Leave type not found', 'LEAVE_TYPE_NOT_FOUND'),
    );
    const res = await request(createApp())
      .patch('/api/leave-types/lt9/archive')
      .set('Authorization', `Bearer ${tokenFor(['hr'])}`);
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('LEAVE_TYPE_NOT_FOUND');
    expect(res.body.error.requestId).toBeDefined();
  });

  it('requires authentication on all routes', async () => {
    const app = createApp();
    const res1 = await request(app).get('/api/leave-types');
    const res2 = await request(app).post('/api/leave-types').send({ name: 'X', quota_days: 1 });
    expect(res1.status).toBe(401);
    expect(res2.status).toBe(401);
  });
});
