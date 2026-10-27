import { isIP } from 'node:net';

/**
 * Client IP as seen by our own nginx. We trust `X-Real-IP` only because the
 * server port is never published (docker-compose has no `ports` for `server`),
 * so the only writer is nginx in front of the app (ADR-0008).
 */
export function getClientIp(req: {
  headers: Record<string, unknown>;
  ip?: string;
  socket?: { remoteAddress?: string };
}): string {
  const header = req.headers['x-real-ip'];
  const candidate = Array.isArray(header) ? header[0] : header;
  if (typeof candidate === 'string' && isIP(candidate)) return candidate;
  if (req.ip && isIP(req.ip)) return req.ip;
  return req.socket?.remoteAddress ?? 'unknown';
}
