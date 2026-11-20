import type { Request, Response, NextFunction } from 'express';
import { ApiError } from './errorHandler.js';
import { verifyAccessToken } from '../modules/auth/auth.service.js';
import type { Role } from '../modules/auth/auth.policy.js';

export type { Role };

export interface AuthUser {
  id: string;
  email: string;
  roles: Role[];
}

/** Verify the Bearer JWT and attach the decoded user to req.user. */
export function requireAuth(req: Request, _res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    next(new ApiError(401, 'Missing or malformed Authorization header', 'UNAUTHORIZED'));
    return;
  }
  const token = header.slice(7).trim();
  if (!token) {
    next(new ApiError(401, 'Empty token', 'UNAUTHORIZED'));
    return;
  }
  try {
    const payload = verifyAccessToken(token);
    req.user = { id: payload.sub, email: payload.email, roles: payload.roles } as AuthUser;
    next();
  } catch {
    next(new ApiError(401, 'Invalid or expired token', 'UNAUTHORIZED'));
  }
}

/** Require the caller to have at least one of the given roles. */
export function requireRole(...roles: Role[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const user = (req as Request & { user?: AuthUser }).user;
    if (!user) {
      next(new ApiError(401, 'Not authenticated', 'UNAUTHORIZED'));
      return;
    }
    if (!roles.some((r) => user.roles.includes(r))) {
      next(new ApiError(403, 'Insufficient permissions', 'FORBIDDEN'));
      return;
    }
    next();
  };
}
