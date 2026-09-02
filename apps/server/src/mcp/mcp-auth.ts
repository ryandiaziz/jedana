import type { NextFunction, Request, Response } from 'express';
import type { ApiKeyService } from '../auth/api-key.service';

export interface McpUser {
  id: string;
  email: string;
}

export type McpAuthedRequest = Request & { user?: McpUser };

/**
 * Express middleware untuk endpoint MCP: memvalidasi header
 * `Authorization: Bearer jdn_...` dan menempelkan user ke `req.user`.
 *
 * Dipasang langsung di instance Express (lihat main.ts), BUKAN lewat pipeline
 * middleware NestJS, karena transport MCP dari @rekog/mcp-nest melakukan
 * self-mount route `/mcp` langsung ke HTTP adapter (`adapter.post('/mcp', ...)`)
 * saat `startAllMicroservices()`. Route itu tidak terdaftar sebagai route Nest,
 * sehingga `consumer.apply(...).forRoutes('mcp')` tidak pernah tereksekusi untuk
 * request MCP (API key tidak divalidasi, dan `req.user` tidak pernah ter-set).
 */
export function createMcpAuthMiddleware(apiKeyService: ApiKeyService) {
  return async (req: McpAuthedRequest, res: Response, next: NextFunction) => {
    try {
      const authHeader = req.headers.authorization;

      if (!authHeader || !authHeader.startsWith('Bearer jdn_')) {
        res.status(401).json({ error: 'Missing or invalid API key' });
        return;
      }

      const user = await apiKeyService.validateKey(authHeader.substring(7));
      if (!user) {
        res.status(401).json({ error: 'Invalid or revoked API key' });
        return;
      }

      req.user = user;
      next();
    } catch (error) {
      next(error);
    }
  };
}
