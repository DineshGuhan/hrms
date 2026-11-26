import type { Request, Response, NextFunction } from 'express';
import { createLeaveRequestSchema } from './leave-requests.schema.js';
import * as service from './leave-requests.service.js';
import type { AuthUser } from '../../middleware/auth.js';

function viewer(req: Request): AuthUser {
  return (req as Request & { user?: AuthUser }).user as AuthUser;
}

export async function createHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const input = createLeaveRequestSchema.parse(req.body);
    const created = await service.createLeaveRequest(input, viewer(req));
    res.status(201).json({ data: created });
  } catch (err) {
    next(err);
  }
}

export async function listMineHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await service.listMyLeaveRequests(viewer(req));
    res.status(200).json({ data });
  } catch (err) {
    next(err);
  }
}

export async function balancesHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await service.getLeaveBalancesForViewer(viewer(req));
    res.status(200).json({ data });
  } catch (err) {
    next(err);
  }
}

export async function cancelHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const cancelled = await service.cancelLeaveRequest(req.params.id, viewer(req));
    res.status(200).json({ data: cancelled });
  } catch (err) {
    next(err);
  }
}
