import { Router } from 'express';
import { requireAuth, type AuthUser } from '../../middleware/auth.js';
import {
  archiveHandler,
  createHandler,
  getHandler,
  headHandler,
  listHandler,
  updateHandler,
} from './departments.controller.js';
import { ApiError } from '../../middleware/errorHandler.js';

const router = Router();

router.use(requireAuth);

/** Route-level guard for management-only endpoints (HR, Admin). */
function requireManager(req: unknown, _res: unknown, next: (err?: unknown) => void): void {
  const user = (req as { user?: AuthUser }).user;
  if (!user || !user.roles.some((r) => r === 'admin' || r === 'hr')) {
    next(new ApiError(403, 'Only HR or Admin can manage departments', 'FORBIDDEN'));
    return;
  }
  next();
}

router.post('/', requireManager, createHandler);
router.get('/', listHandler);
router.get('/:id', getHandler);
router.patch('/:id', requireManager, updateHandler);
router.patch('/:id/head', requireManager, headHandler);
router.patch('/:id/archive', requireManager, archiveHandler);

export default router;
