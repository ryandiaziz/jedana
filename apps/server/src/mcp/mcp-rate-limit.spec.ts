import type { Request, Response } from 'express';
import { createMcpRateLimiter } from './mcp-rate-limit';

describe('createMcpRateLimiter', () => {
  function createMockRes() {
    const res: Partial<Response> & {
      headers: Record<string, string>;
      statusCode?: number;
      body?: unknown;
    } = {
      headers: {},
      setHeader: jest.fn((name: string, value: string) => {
        res.headers[name] = value;
        return res as Response;
      }),
      status: jest.fn((code: number) => {
        res.statusCode = code;
        return res as Response;
      }),
      json: jest.fn((body: unknown) => {
        res.body = body;
        return res as Response;
      }),
    };
    return res as Response & typeof res;
  }

  it('allows the first 120 requests within the window', () => {
    let fakeNow = 1_000_000;
    const limiter = createMcpRateLimiter({
      limit: 120,
      windowMs: 60_000,
      keyOf: () => 'user:u1',
      now: () => fakeNow,
    });

    const req = {} as Request;
    for (let i = 0; i < 120; i++) {
      const res = createMockRes();
      const next = jest.fn();
      limiter(req, res, next);
      expect(next).toHaveBeenCalledTimes(1);
      expect(res.status).not.toHaveBeenCalled();
    }
  });

  it('rejects request 121 with 429 and Retry-After header', () => {
    let fakeNow = 1_000_000;
    const limiter = createMcpRateLimiter({
      limit: 120,
      windowMs: 60_000,
      keyOf: () => 'user:u1',
      now: () => fakeNow,
    });

    const req = {} as Request;
    for (let i = 0; i < 120; i++) {
      const res = createMockRes();
      const next = jest.fn();
      limiter(req, res, next);
    }

    const res121 = createMockRes();
    const next121 = jest.fn();
    limiter(req, res121, next121);

    expect(next121).not.toHaveBeenCalled();
    expect(res121.status).toHaveBeenCalledWith(429);
    expect(res121.setHeader).toHaveBeenCalledWith('Retry-After', '60');
    expect(res121.json).toHaveBeenCalledWith({
      error: 'Too many requests',
      retryAfterSeconds: 60,
    });
  });

  it('allows requests again after the time window shifts', () => {
    let fakeNow = 1_000_000;
    const limiter = createMcpRateLimiter({
      limit: 120,
      windowMs: 60_000,
      keyOf: () => 'user:u1',
      now: () => fakeNow,
    });

    const req = {} as Request;
    for (let i = 0; i < 120; i++) {
      const res = createMockRes();
      const next = jest.fn();
      limiter(req, res, next);
    }

    // Exceeded at 121
    const resExceeded = createMockRes();
    const nextExceeded = jest.fn();
    limiter(req, resExceeded, nextExceeded);
    expect(resExceeded.statusCode).toBe(429);

    // Fast-forward time past window
    fakeNow += 60_001;

    // Next request should pass again
    const resAfterReset = createMockRes();
    const nextAfterReset = jest.fn();
    limiter(req, resAfterReset, nextAfterReset);
    expect(nextAfterReset).toHaveBeenCalledTimes(1);
    expect(resAfterReset.statusCode).toBeUndefined();
  });

  it('tracks different keys independently without sharing quota', () => {
    let fakeNow = 1_000_000;
    const limiter = createMcpRateLimiter({
      limit: 10,
      windowMs: 60_000,
      keyOf: (req) => (req as any).userKey,
      now: () => fakeNow,
    });

    const reqA = { userKey: 'user:alice' } as unknown as Request;
    const reqB = { userKey: 'user:bob' } as unknown as Request;

    // Use up Alice's quota
    for (let i = 0; i < 10; i++) {
      const res = createMockRes();
      const next = jest.fn();
      limiter(reqA, res, next);
      expect(next).toHaveBeenCalledTimes(1);
    }

    // Alice is now rate-limited
    const resA11 = createMockRes();
    const nextA11 = jest.fn();
    limiter(reqA, resA11, nextA11);
    expect(resA11.statusCode).toBe(429);
    expect(nextA11).not.toHaveBeenCalled();

    // Bob still has fresh quota
    const resB = createMockRes();
    const nextB = jest.fn();
    limiter(reqB, resB, nextB);
    expect(nextB).toHaveBeenCalledTimes(1);
    expect(resB.statusCode).toBeUndefined();
  });

  it('prunes expired entries when handling requests', () => {
    let fakeNow = 1_000_000;
    const limiter = createMcpRateLimiter({
      limit: 10,
      windowMs: 10_000,
      keyOf: (req) => (req as any).userKey,
      now: () => fakeNow,
    });

    const req1 = { userKey: 'user:one' } as unknown as Request;
    const req2 = { userKey: 'user:two' } as unknown as Request;

    // User 1 sends request at t=1_000_000
    limiter(req1, createMockRes(), jest.fn());

    // Advance time past user 1 window
    fakeNow += 15_000;

    // User 2 sends request at t=1_015_000, triggering pruning
    limiter(req2, createMockRes(), jest.fn());

    // User 1 sends request again at t=1_015_000; should have fresh window
    const res1 = createMockRes();
    const next1 = jest.fn();
    limiter(req1, res1, next1);
    expect(next1).toHaveBeenCalledTimes(1);
  });
});
