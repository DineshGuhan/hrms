import { ApiError, errorHandler } from './errorHandler.js';
import { ZodError } from 'zod';
import type { Request, Response } from 'express';

function makeMocks(): { req: Request; res: Response; json: jest.Mock; status: jest.Mock } {
  const json = jest.fn();
  const status = jest.fn().mockReturnValue({ json });
  const res = { status, json } as unknown as Response;
  const req = { id: 'req-1', originalUrl: '/api/test', method: 'GET' } as unknown as Request;
  return { req, res, json, status };
}

describe('errorHandler middleware', () => {
  it('maps ApiError to its status, code, and message', () => {
    const { req, res, json, status } = makeMocks();
    errorHandler(new ApiError(403, 'Nope', 'FORBIDDEN'), req, res, jest.fn());
    expect(status).toHaveBeenCalledWith(403);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: expect.objectContaining({ code: 'FORBIDDEN', message: 'Nope', requestId: 'req-1' }),
      }),
    );
  });

  it('maps ZodError to 400 with field details', () => {
    const { req, res, json, status } = makeMocks();
    const zodError = new ZodError([
      { path: ['email'], message: 'Invalid email', code: 'invalid_type', expected: 'string', received: 'number' },
    ]);
    errorHandler(zodError, req, res, jest.fn());
    expect(status).toHaveBeenCalledWith(400);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: expect.objectContaining({
          code: 'VALIDATION_ERROR',
          details: [{ path: 'email', message: 'Invalid email' }],
        }),
      }),
    );
  });

  it('maps unknown errors to 500 INTERNAL_ERROR', () => {
    const { req, res, json, status } = makeMocks();
    errorHandler(new Error('boom'), req, res, jest.fn());
    expect(status).toHaveBeenCalledWith(500);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: expect.objectContaining({ code: 'INTERNAL_ERROR' }),
      }),
    );
  });

  it('hides error details in production', () => {
    const { req, res, json } = makeMocks();
    const prev = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    try {
      errorHandler(new Error('boom with secret'), req, res, jest.fn());
      expect(json).toHaveBeenCalledWith(
        expect.not.objectContaining({
          error: expect.objectContaining({ details: 'boom with secret' }),
        }),
      );
    } finally {
      process.env.NODE_ENV = prev;
    }
  });

  it('exposes error details in development', () => {
    const { req, res, json } = makeMocks();
    const prev = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';
    try {
      errorHandler(new Error('boom'), req, res, jest.fn());
      expect(json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({ details: 'boom' }),
        }),
      );
    } finally {
      process.env.NODE_ENV = prev;
    }
  });
});
