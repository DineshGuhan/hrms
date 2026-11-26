import { Router } from 'express';
import { requireAuth, type AuthUser } from '../../middleware/auth.js';
import { ApiError } from '../../middleware/errorHandler.js';
import {
  archiveHandler,
  createHandler,
  listHandler,
  updateHandler,
} from './leave-types.controller.js';

const router = Router({ mergeParams: true });

/** Route-level guard for management-only endpoints (HR, Admin). */
function requireManager(req: unknown, _res: unknown, next: (err?: unknown) => void): void {
  const user = (req as { user?: AuthUser }).user;
  if (!user || !user.roles.some((r) => r === 'admin' || r === 'hr')) {
    next(new ApiError(403, 'Only HR or Admin can manage leave types', 'FORBIDDEN'));
    return;
  }
  next();
}

// requireAuth is applied per-route (not router.use) so that mounting this
// router under /api doesn't swallow unmatched /api routes that should 404.
router.post('/leave-types', requireAuth, requireManager, createHandler);
router.get('/leave-types', requireAuth, listHandler);
router.patch('/leave-types/:id', requireAuth, requireManager, updateHandler);
router.patch('/leave-types/:id/archive', requireAuth, requireManager, archiveHandler);

export default router;
