import type { Request, Response, NextFunction } from 'express';
import { ApiError } from './errorHandler.js';

export type Role = 'admin' | 'hr' | 'manager' | 'employee';

export interface AuthUser {
  id: string;
  email: string;
  roles: Role[];
}

/** Minimal JWT verify middleware (basic version for HRM-6; full auth module is HRM-3). */
export function requireAuth(req: Request, _res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    next(new ApiError(401, 'Missing or malformed Authorization header', 'UNAUTHORIZED'));
    return;
  }
  // Full JWT verification lands with HRM-3 (auth module). Here we only check presence.
  const token = header.slice(7);
  if (!token) {
    next(new ApiError(401, 'Empty token', 'UNAUTHORIZED'));
    return;
  }
  next();
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
