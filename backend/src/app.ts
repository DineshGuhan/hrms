import express, { type Express } from 'express';
import { pinoHttp } from 'pino-http';
import { logger } from './utils/logger.js';
import { requestId } from './middleware/requestId.js';
import { errorHandler, notFound } from './middleware/errorHandler.js';
import healthRouter from './modules/health/health.routes.js';

export function createApp(): Express {
  const app = express();

  app.use(requestId);
  app.use(pinoHttp({ logger, genReqId: (req) => req.id as string }));
  app.use(express.json({ limit: '1mb' }));

  app.use('/api', healthRouter);

  app.use(notFound);
  app.use(errorHandler);

  return app;
}
