import { randomUUID } from 'crypto';
import { requestId } from './requestId.js';
import type { Request, Response } from 'express';

function makeRes(): { res: Response; headers: Record<string, string> } {
  const headers: Record<string, string> = {};
  const res = {
    setHeader: (name: string, value: string) => {
      headers[name] = value;
    },
  } as unknown as Response;
  return { res, headers };
}

describe('requestId middleware', () => {
  it('attaches a unique request id when none is provided', () => {
    const req = { headers: {} } as Request;
    const { res, headers } = makeRes();
    const next = jest.fn();
    requestId(req, res, next);
    expect(next).toHaveBeenCalled();
    expect(req.id).toMatch(/^[0-9a-f-]{36}$/);
    expect(headers['X-Request-Id']).toBe(req.id);
  });

  it('echoes the incoming X-Request-Id header', () => {
    const id = randomUUID();
    const req = { headers: { 'x-request-id': id } } as unknown as Request;
    const { res, headers } = makeRes();
    requestId(req, res, jest.fn());
    expect(req.id).toBe(id);
    expect(headers['X-Request-Id']).toBe(id);
  });

  it('generates different ids for different requests', () => {
    const ids: string[] = [];
    for (let i = 0; i < 2; i++) {
      const req = { headers: {} } as Request;
      requestId(req, makeRes().res, jest.fn());
      ids.push(req.id as string);
    }
    expect(ids[0]).not.toBe(ids[1]);
  });
});
