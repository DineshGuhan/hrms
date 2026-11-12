import request from 'supertest';
import { createApp } from '../../app.js';
import { getHealth } from './health.service.js';

jest.mock('../../config/db.js', () => ({
  query: jest.fn().mockResolvedValue({ rows: [], rowCount: 0 }),
}));

describe('health endpoint', () => {
  it('GET /api/health returns 200 and ok status', async () => {
    const app = createApp();
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ status: 'ok', database: 'up' });
    expect(res.body).toHaveProperty('uptimeSeconds');
    expect(res.headers['x-request-id']).toBeDefined();
  });

  it('returns 503 when the database is down', async () => {
    const { query } = jest.requireMock('../../config/db.js');
    query.mockRejectedValueOnce(new Error('connection refused'));
    const app = createApp();
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(503);
    expect(res.body).toMatchObject({ status: 'degraded', database: 'down' });
  });

  it('getHealth returns degraded when the DB ping fails', async () => {
    const { query } = jest.requireMock('../../config/db.js');
    query.mockRejectedValueOnce(new Error('down'));
    const health = await getHealth();
    expect(health.status).toBe('degraded');
    expect(health.database).toBe('down');
  });
});

describe('request id middleware', () => {
  it('echoes the incoming X-Request-Id header', async () => {
    const app = createApp();
    const res = await request(app).get('/api/health').set('X-Request-Id', 'test-req-id');
    expect(res.headers['x-request-id']).toBe('test-req-id');
  });
});

describe('unknown routes', () => {
  it('returns 404 with the standard error shape', async () => {
    const app = createApp();
    const res = await request(app).get('/api/does-not-exist');
    expect(res.status).toBe(404);
    expect(res.body.error).toMatchObject({ code: 'NOT_FOUND' });
    expect(res.body.error.requestId).toBeDefined();
  });
});
