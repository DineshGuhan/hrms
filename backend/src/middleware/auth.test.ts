import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { ApiError } from './errorHandler.js';
import { requireAuth, requireRole, type AuthUser } from './auth.js';

function makeReq(headers: Record<string, string> = {}, user?: AuthUser): Request {
  return { headers, user } as unknown as Request;
}

const next = jest.fn() as jest.Mock & NextFunction;
const res = {} as Response;

beforeEach(() => {
  next.mockClear();
});

const SECRET = process.env.JWT_SECRET as string;

describe('requireAuth (JWT verification)', () => {
  it('passes a valid Bearer token and attaches the decoded user', () => {
    const token = jwt.sign({ sub: 'u9', email: 'u9@x.co', roles: ['hr'] }, SECRET, { algorithm: 'HS256' });
    const req = makeReq({ authorization: `Bearer ${token}` });
    requireAuth(req, res, next);
    expect(next).toHaveBeenCalledWith();
    expect(req.user).toMatchObject({ id: 'u9', email: 'u9@x.co', roles: ['hr'] });
  });

  it('rejects a missing Authorization header', () => {
    requireAuth(makeReq(), res, next);
    expect(next).toHaveBeenCalledWith(expect.any(ApiError));
    expect(next.mock.calls[0][0].status).toBe(401);
  });

  it('rejects a non-Bearer scheme', () => {
    requireAuth(makeReq({ authorization: 'Basic xyz' }), res, next);
    expect(next).toHaveBeenCalledWith(expect.any(ApiError));
    expect(next.mock.calls[0][0].status).toBe(401);
  });

  it('rejects an empty token', () => {
    requireAuth(makeReq({ authorization: 'Bearer ' }), res, next);
    expect(next).toHaveBeenCalledWith(expect.any(ApiError));
    expect(next.mock.calls[0][0].status).toBe(401);
  });

  it('rejects a garbage token', () => {
    requireAuth(makeReq({ authorization: 'Bearer not-a-jwt' }), res, next);
    expect(next).toHaveBeenCalledWith(expect.any(ApiError));
    expect(next.mock.calls[0][0].status).toBe(401);
  });

  it('rejects an expired token', () => {
    const expired = jwt.sign(
      { sub: 'u9', email: 'u9@x.co', roles: [] },
      SECRET,
      { algorithm: 'HS256', expiresIn: -10 },
    );
    requireAuth(makeReq({ authorization: `Bearer ${expired}` }), res, next);
    expect(next).toHaveBeenCalledWith(expect.any(ApiError));
    expect(next.mock.calls[0][0].status).toBe(401);
  });
});

describe('requireRole', () => {
  const adminUser: AuthUser = { id: 'u1', email: 'a@b.c', roles: ['admin'] };

  it('passes when the user has a required role', () => {
    requireRole('admin')(makeReq({}, adminUser), res, next);
    expect(next).toHaveBeenCalledWith();
  });

  it('passes when the user has one of several required roles', () => {
    requireRole('hr', 'admin')(makeReq({}, adminUser), res, next);
    expect(next).toHaveBeenCalledWith();
  });

  it('rejects a user without a required role', () => {
    requireRole('hr')(makeReq({}, adminUser), res, next);
    expect(next).toHaveBeenCalledWith(expect.any(ApiError));
    expect(next.mock.calls[0][0].status).toBe(403);
  });

  it('rejects an unauthenticated request', () => {
    requireRole('admin')(makeReq(), res, next);
    expect(next).toHaveBeenCalledWith(expect.any(ApiError));
    expect(next.mock.calls[0][0].status).toBe(401);
  });
});
