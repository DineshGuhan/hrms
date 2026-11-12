import { randomUUID } from 'crypto';
import type { Request, Response, NextFunction } from 'express';

/** Attach a unique request ID to each request (echoes the incoming X-Request-Id if present). */
export function requestId(req: Request, res: Response, next: NextFunction): void {
  const id = (req.headers['x-request-id'] as string) || randomUUID();
  req.id = id;
  res.setHeader('X-Request-Id', id);
  next();
}
