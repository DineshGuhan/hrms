import request from 'supertest';
import { createApp } from '../../app.js';
import { ApiError } from '../../middleware/errorHandler.js';
import * as service from './auth.service.js';

jest.mock('./auth.service.js', () => ({
  ...jest.requireActual('./auth.service.js'),
  login: jest.fn(),
  refresh: jest.fn(),
  logout: jest.fn(),
}));

const mockService = service as jest.Mocked<typeof service>;

function loginResponse() {
  return {
    accessToken: 'access-token',
    refreshToken: 'refresh-token',
    user: { id: 'u1', email: 'a@b.c', roles: ['employee' as const] },
  };
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('POST /api/auth/login', () => {
  it('returns 200 with the access token and sets the refresh cookie', async () => {
    mockService.login.mockResolvedValue(loginResponse());
    const res = await request(createApp())
      .post('/api/auth/login')
      .send({ email: 'asha@example.com', password: 'long-enough-password' });

    expect(res.status).toBe(200);
    expect(res.body.token).toBe('access-token');
    expect(res.body.user.email).toBe('a@b.c');
    const cookie = res.headers['set-cookie'] as unknown as string[];
    const refreshCookie = cookie.find((c) => c.startsWith('refresh_token='));
    expect(refreshCookie).toBeDefined();
    expect(refreshCookie).toContain('HttpOnly');
    expect(refreshCookie).toContain('Path=/api/auth');
    expect(refreshCookie).toContain('SameSite=Strict');
  });

  it('returns 400 with VALIDATION_ERROR for a malformed body', async () => {
    const res = await request(createApp())
      .post('/api/auth/login')
      .send({ email: 'not-an-email', password: 'short' });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(res.body.error.requestId).toBeDefined();
  });

  it('maps a service 401 to the standard error shape', async () => {
    mockService.login.mockRejectedValue(
      new ApiError(401, 'Invalid email or password', 'INVALID_CREDENTIALS'),
    );
    const res = await request(createApp())
      .post('/api/auth/login')
      .send({ email: 'asha@example.com', password: 'long-enough-password' });

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('INVALID_CREDENTIALS');
  });

  it('maps a service 423 (locked account) to the standard error shape', async () => {
    mockService.login.mockRejectedValue(
      new ApiError(
        423,
        'Account locked due to too many failed attempts. Try again later.',
        'ACCOUNT_LOCKED',
      ),
    );
    const res = await request(createApp())
      .post('/api/auth/login')
      .send({ email: 'asha@example.com', password: 'long-enough-password' });

    expect(res.status).toBe(423);
    expect(res.body.error.code).toBe('ACCOUNT_LOCKED');
  });
});

describe('POST /api/auth/refresh', () => {
  it('returns 200 with a new access token and rotates the cookie', async () => {
    mockService.refresh.mockResolvedValue({ accessToken: 'new-access', refreshToken: 'new-refresh' });
    const res = await request(createApp())
      .post('/api/auth/refresh')
      .set('Cookie', 'refresh_token=old-token');

    expect(res.status).toBe(200);
    expect(res.body.token).toBe('new-access');
    expect(mockService.refresh).toHaveBeenCalledWith('old-token');
  });

  it('returns 401 when the refresh cookie is missing', async () => {
    const res = await request(createApp()).post('/api/auth/refresh');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });
});

describe('POST /api/auth/logout', () => {
  it('revokes the token and clears the cookie', async () => {
    mockService.logout.mockResolvedValue(undefined);
    const res = await request(createApp())
      .post('/api/auth/logout')
      .set('Cookie', 'refresh_token=some-token');

    expect(res.status).toBe(200);
    expect(mockService.logout).toHaveBeenCalledWith('some-token');
    const cookie = res.headers['set-cookie'] as unknown as string[];
    expect(cookie.some((c) => c.startsWith('refresh_token=;'))).toBe(true);
  });

  it('succeeds even without a cookie', async () => {
    const res = await request(createApp()).post('/api/auth/logout');
    expect(res.status).toBe(200);
    expect(mockService.logout).not.toHaveBeenCalled();
  });
});
