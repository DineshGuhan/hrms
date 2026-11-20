import type { Request, Response, NextFunction } from 'express';
import { loginSchema } from './auth.schema.js';
import * as service from './auth.service.js';
import { ApiError } from '../../middleware/errorHandler.js';

export const REFRESH_COOKIE = 'refresh_token';
const REFRESH_COOKIE_PATH = '/api/auth';

function setRefreshCookie(res: Response, token: string): void {
  res.cookie(REFRESH_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: REFRESH_COOKIE_PATH,
    maxAge: service.REFRESH_TTL_DAYS * 24 * 60 * 60 * 1000,
  });
}

function clearRefreshCookie(res: Response): void {
  res.clearCookie(REFRESH_COOKIE, { path: REFRESH_COOKIE_PATH });
}

function readRefreshCookie(req: Request): string {
  const token = (req.cookies as Record<string, string | undefined> | undefined)?.[REFRESH_COOKIE];
  if (!token) throw new ApiError(401, 'Missing refresh token', 'UNAUTHORIZED');
  return token;
}

export async function loginHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const { email, password } = loginSchema.parse(req.body);
    const result = await service.login(email, password);
    setRefreshCookie(res, result.refreshToken);
    res.status(200).json({ token: result.accessToken, user: result.user });
  } catch (err) {
    next(err);
  }
}

export async function refreshHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await service.refresh(readRefreshCookie(req));
    setRefreshCookie(res, result.refreshToken);
    res.status(200).json({ token: result.accessToken });
  } catch (err) {
    next(err);
  }
}

export async function logoutHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const token = (req.cookies as Record<string, string | undefined> | undefined)?.[REFRESH_COOKIE];
    if (token) await service.logout(token);
    clearRefreshCookie(res);
    res.status(200).json({ ok: true });
  } catch (err) {
    next(err);
  }
}
