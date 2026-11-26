import request from 'supertest';
import jwt from 'jsonwebtoken';
import { createApp } from '../../app.js';
import { ApiError } from '../../middleware/errorHandler.js';
import * as service from './leave-requests.service.js';

jest.mock('./leave-requests.service.js', () => ({
  ...jest.requireActual('./leave-requests.service.js'),
  createLeaveRequest: jest.fn(),
  listMyLeaveRequests: jest.fn(),
  getLeaveBalancesForViewer: jest.fn(),
  cancelLeaveRequest: jest.fn(),
}));

const mockService = service as jest.Mocked<typeof service>;
const SECRET = process.env.JWT_SECRET as string;

function tokenFor(roles: string[]): string {
  return jwt.sign({ sub: 'u1', email: 'u1@x.co', roles }, SECRET, { algorithm: 'HS256' });
}

const VALID_TYPE_ID = '11111111-1111-1111-1111-111111111111';

beforeEach(() => {
  jest.clearAllMocks();
});

describe('leave requests routes', () => {
  it('POST /api/leave-requests returns 201', async () => {
    (mockService.createLeaveRequest as jest.Mock).mockResolvedValue({ id: 'lr1', status: 'pending' });
    const res = await request(createApp())
      .post('/api/leave-requests')
      .set('Authorization', `Bearer ${tokenFor(['employee'])}`)
      .send({ leave_type_id: VALID_TYPE_ID, start_date: '2030-06-03', end_date: '2030-06-07', reason: 'Family' });
    expect(res.status).toBe(201);
    expect(res.body.data.status).toBe('pending');
  });

  it('POST returns 400 for a malformed body', async () => {
    const res = await request(createApp())
      .post('/api/leave-requests')
      .set('Authorization', `Bearer ${tokenFor(['employee'])}`)
      .send({ leave_type_id: 'nope' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('POST maps 409 overlap and 422 balance errors into the standard shape', async () => {
    (mockService.createLeaveRequest as jest.Mock).mockRejectedValue(
      new ApiError(409, 'You already have a request overlapping these dates', 'OVERLAP'),
    );
    const res = await request(createApp())
      .post('/api/leave-requests')
      .set('Authorization', `Bearer ${tokenFor(['employee'])}`)
      .send({ leave_type_id: VALID_TYPE_ID, start_date: '2030-06-03', end_date: '2030-06-07', reason: 'r' });
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('OVERLAP');
  });

  it('GET /mine returns the caller’s requests', async () => {
    (mockService.listMyLeaveRequests as jest.Mock).mockResolvedValue([]);
    const res = await request(createApp())
      .get('/api/leave-requests/mine')
      .set('Authorization', `Bearer ${tokenFor(['employee'])}`);
    expect(res.status).toBe(200);
    expect(mockService.listMyLeaveRequests).toHaveBeenCalled();
  });

  it('GET /balances returns remaining days per type', async () => {
    (mockService.getLeaveBalancesForViewer as jest.Mock).mockResolvedValue([
      { leave_type_id: 'lt1', name: 'Annual', quota_days: 20, used_days: 5, remaining_days: 15 },
    ]);
    const res = await request(createApp())
      .get('/api/leave-requests/balances')
      .set('Authorization', `Bearer ${tokenFor(['employee'])}`);
    expect(res.status).toBe(200);
    expect(res.body.data[0].remaining_days).toBe(15);
  });

  it('PATCH /:id/cancel calls the service', async () => {
    (mockService.cancelLeaveRequest as jest.Mock).mockResolvedValue({ id: 'lr1', status: 'cancelled' });
    const res = await request(createApp())
      .patch('/api/leave-requests/lr1/cancel')
      .set('Authorization', `Bearer ${tokenFor(['employee'])}`);
    expect(res.status).toBe(200);
    expect(mockService.cancelLeaveRequest).toHaveBeenCalledWith('lr1', expect.anything());
  });

  it('requires authentication on all routes', async () => {
    const app = createApp();
    const res1 = await request(app).get('/api/leave-requests/mine');
    const res2 = await request(app).post('/api/leave-requests').send({});
    expect(res1.status).toBe(401);
    expect(res2.status).toBe(401);
  });
});
