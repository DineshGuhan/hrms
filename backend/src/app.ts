import express, { type Express } from 'express';
import cookieParser from 'cookie-parser';
import { pinoHttp } from 'pino-http';
import { logger } from './utils/logger.js';
import { requestId } from './middleware/requestId.js';
import { errorHandler, notFound } from './middleware/errorHandler.js';
import healthRouter from './modules/health/health.routes.js';
import authRouter from './modules/auth/auth.routes.js';

export function createApp(): Express {
  const app = express();

  app.use(requestId);
  app.use(pinoHttp({ logger, genReqId: (req) => req.id as string }));
  app.use(express.json({ limit: '1mb' }));
  app.use(cookieParser());

  app.use('/api', healthRouter);
  app.use('/api/auth', authRouter);

  app.use(notFound);
  app.use(errorHandler);

  return app;
}
