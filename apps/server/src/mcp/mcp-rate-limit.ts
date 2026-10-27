import type { Request, Response, NextFunction, RequestHandler } from 'express';

export interface McpRateLimitOptions {
  limit: number;
  windowMs: number;
  keyOf: (req: Request) => string;
  now?: () => number; // untuk test
}

interface RateLimitRecord {
  count: number;
  resetTime: number;
}

/**
 * In-memory fixed-window rate limiter for MCP endpoints (ADR-0008).
 * Cleans expired entries on access to prevent unbounded memory growth.
 */
export function createMcpRateLimiter(options: McpRateLimitOptions): RequestHandler {
  const { limit, windowMs, keyOf, now = Date.now } = options;
  const store = new Map<string, RateLimitRecord>();

  return (req: Request, res: Response, next: NextFunction): void => {
    const currentTime = now();

    // Clean up expired entries whenever accessing the store
    for (const [k, record] of store.entries()) {
      if (record.resetTime <= currentTime) {
        store.delete(k);
      }
    }

    const key = keyOf(req);
    const existing = store.get(key);

    if (!existing) {
      store.set(key, {
        count: 1,
        resetTime: currentTime + windowMs,
      });
      next();
      return;
    }

    if (existing.count < limit) {
      existing.count += 1;
      next();
      return;
    }

    // Rate limit exceeded
    const retryAfterSeconds = Math.max(
      1,
      Math.ceil((existing.resetTime - currentTime) / 1000),
    );

    res.setHeader('Retry-After', String(retryAfterSeconds));
    res.status(429).json({
      error: 'Too many requests',
      retryAfterSeconds,
    });
  };
}
