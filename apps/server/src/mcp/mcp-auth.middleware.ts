import { Injectable, NestMiddleware, UnauthorizedException } from '@nestjs/common';
import type { Request, Response, NextFunction } from 'express';
import { ApiKeyService } from '../auth/api-key.service';

/**
 * Middleware that validates API key from Authorization header
 * and attaches user to the request object.
 * Applied to MCP endpoint routes.
 */
@Injectable()
export class McpAuthMiddleware implements NestMiddleware {
  constructor(private readonly apiKeyService: ApiKeyService) {}

  async use(req: Request, res: Response, next: NextFunction) {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer jdn_')) {
      res.status(401).json({ error: 'Missing or invalid API key' });
      return;
    }

    const plainKey = authHeader.substring(7); // Remove "Bearer "
    const user = await this.apiKeyService.validateKey(plainKey);

    if (!user) {
      res.status(401).json({ error: 'Invalid or revoked API key' });
      return;
    }

    // Attach user to request so MCP strategy can access it via rawRequest.user
    (req as Request & { user: { id: string; email: string } }).user = user;
    next();
  }
}
