import { Router } from 'express';
import { requireAuth } from '../../middleware/auth.js';
import {
  createHandler,
  getHandler,
  listHandler,
  statusHandler,
  updateHandler,
} from './employees.controller.js';
import { canManageEmployees } from './employees.policy.js';
import { ApiError } from '../../middleware/errorHandler.js';
import type { AuthUser } from '../../middleware/auth.js';

const router = Router();

router.use(requireAuth);

/** Route-level guard for management-only endpoints (HR, Admin). */
function requireManager(req: unknown, _res: unknown, next: (err?: unknown) => void): void {
  const user = (req as { user?: AuthUser }).user;
  if (!user || !canManageEmployees(user.roles)) {
    next(new ApiError(403, 'Only HR or Admin can perform this action', 'FORBIDDEN'));
    return;
  }
  next();
}

router.post('/', requireManager, createHandler);
router.get('/', listHandler);
router.get('/:id', getHandler);
router.patch('/:id', updateHandler);
router.patch('/:id/status', requireManager, statusHandler);

export default router;
