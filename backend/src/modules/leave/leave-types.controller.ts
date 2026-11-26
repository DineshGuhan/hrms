import type { Request, Response, NextFunction } from 'express';
import { createLeaveTypeSchema, updateLeaveTypeSchema } from './leave-types.schema.js';
import * as service from './leave-types.service.js';
import type { AuthUser } from '../../middleware/auth.js';

function viewer(req: Request): AuthUser {
  return (req as Request & { user?: AuthUser }).user as AuthUser;
}

export async function createHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const input = createLeaveTypeSchema.parse(req.body);
    const leaveType = await service.createLeaveType(input, viewer(req));
    res.status(201).json({ data: leaveType });
  } catch (err) {
    next(err);
  }
}

export async function listHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await service.listLeaveTypes(viewer(req));
    res.status(200).json({ data });
  } catch (err) {
    next(err);
  }
}

export async function updateHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const input = updateLeaveTypeSchema.parse(req.body);
    const leaveType = await service.updateLeaveType(req.params.id, input, viewer(req));
    res.status(200).json({ data: leaveType });
  } catch (err) {
    next(err);
  }
}

export async function archiveHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const leaveType = await service.archiveLeaveType(req.params.id, viewer(req));
    res.status(200).json({ data: leaveType });
  } catch (err) {
    next(err);
  }
}
