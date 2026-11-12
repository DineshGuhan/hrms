import { Router } from 'express';
import { getHealth } from './health.service.js';

const router = Router();

router.get('/health', async (_req, res, next) => {
  try {
    const health = await getHealth();
    res.status(health.status === 'ok' ? 200 : 503).json(health);
  } catch (err) {
    next(err);
  }
});

export default router;
