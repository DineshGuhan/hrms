import { Router } from 'express';
import { requireAuth } from '../../middleware/auth.js';
import {
  balancesHandler,
  cancelHandler,
  createHandler,
  listMineHandler,
} from './leave-requests.controller.js';

const router = Router();

// All routes require authentication (any role). Role-scoped queries are
// handled per-route: employees see their own, managers/HR get team views
// in the approval story (HRM-26).
router.post('/leave-requests', requireAuth, createHandler);
router.get('/leave-requests/mine', requireAuth, listMineHandler);
router.get('/leave-requests/balances', requireAuth, balancesHandler);
router.patch('/leave-requests/:id/cancel', requireAuth, cancelHandler);

export default router;
