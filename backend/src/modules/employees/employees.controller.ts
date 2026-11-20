import type { Request, Response, NextFunction } from 'express';
import {
  adminUpdateSchema,
  createEmployeeSchema,
  listQuerySchema,
  selfUpdateSchema,
  statusChangeSchema,
} from './employees.schema.js';
import * as service from './employees.service.js';
import type { AuthUser } from '../../middleware/auth.js';

function viewer(req: Request): AuthUser {
  return (req as Request & { user?: AuthUser }).user as AuthUser;
}

export async function createHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const input = createEmployeeSchema.parse(req.body);
    const employee = await service.createEmployee(input, viewer(req));
    res.status(201).json({ data: employee });
  } catch (err) {
    next(err);
  }
}

export async function getHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const employee = await service.getEmployee(req.params.id, viewer(req));
    res.status(200).json({ data: employee });
  } catch (err) {
    next(err);
  }
}

export async function listHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const query = listQuerySchema.parse(req.query);
    const result = await service.listEmployees(query, viewer(req));
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}

export async function updateHandler(req: Request, res: Response, next: NextFunction) {
  try {
    // The service decides which schema applies based on the caller's role.
    const adminParsed = adminUpdateSchema.safeParse(req.body);
    if (adminParsed.success) {
      const employee = await service.updateEmployee(req.params.id, adminParsed.data, viewer(req));
      res.status(200).json({ data: employee });
      return;
    }
    const selfParsed = selfUpdateSchema.safeParse(req.body);
    if (selfParsed.success) {
      const employee = await service.updateEmployee(req.params.id, selfParsed.data, viewer(req));
      res.status(200).json({ data: employee });
      return;
    }
    // Neither schema matched — surface the admin schema's issues (superset of fields).
    adminUpdateSchema.parse(req.body);
  } catch (err) {
    next(err);
  }
}

export async function statusHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const { status } = statusChangeSchema.parse(req.body);
    const employee = await service.setEmployeeStatus(req.params.id, status, viewer(req));
    res.status(200).json({ data: employee });
  } catch (err) {
    next(err);
  }
}
