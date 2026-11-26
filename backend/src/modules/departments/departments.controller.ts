import type { Request, Response, NextFunction } from 'express';
import {
  assignHeadSchema,
  createDepartmentSchema,
  updateDepartmentSchema,
} from './departments.schema.js';
import * as service from './departments.service.js';
import type { AuthUser } from '../../middleware/auth.js';

function viewer(req: Request): AuthUser {
  return (req as Request & { user?: AuthUser }).user as AuthUser;
}

export async function createHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const input = createDepartmentSchema.parse(req.body);
    const department = await service.createDepartment(input, viewer(req));
    res.status(201).json({ data: department });
  } catch (err) {
    next(err);
  }
}

export async function getHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const department = await service.getDepartment(req.params.id, viewer(req));
    res.status(200).json({ data: department });
  } catch (err) {
    next(err);
  }
}

export async function listHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await service.listDepartments(viewer(req));
    res.status(200).json({ data });
  } catch (err) {
    next(err);
  }
}

export async function updateHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const input = updateDepartmentSchema.parse(req.body);
    const department = await service.updateDepartment(req.params.id, input, viewer(req));
    res.status(200).json({ data: department });
  } catch (err) {
    next(err);
  }
}

export async function headHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const input = assignHeadSchema.parse(req.body);
    const department = await service.assignHead(req.params.id, input, viewer(req));
    res.status(200).json({ data: department });
  } catch (err) {
    next(err);
  }
}

export async function archiveHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const department = await service.archiveDepartment(req.params.id, viewer(req));
    res.status(200).json({ data: department });
  } catch (err) {
    next(err);
  }
}
