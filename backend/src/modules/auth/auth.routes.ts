import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { loginHandler, logoutHandler, refreshHandler } from './auth.controller.js';

const router = Router();

// NFR-SEC: rate limiting on auth routes (per IP, on top of the per-account lockout).
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 100,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
});

router.post('/login', authLimiter, loginHandler);
router.post('/refresh', authLimiter, refreshHandler);
router.post('/logout', logoutHandler);

export default router;
