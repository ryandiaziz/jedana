import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { ApiKeyService } from './api-key.service';
import type { Request } from 'express';

@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(private readonly apiKeyService: ApiKeyService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const authHeader = request.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer jdn_')) {
      throw new UnauthorizedException('Missing or invalid API key');
    }

    const plainKey = authHeader.substring(7); // Remove "Bearer "
    const user = await this.apiKeyService.validateKey(plainKey);

    if (!user) {
      throw new UnauthorizedException('Invalid or revoked API key');
    }

    // Attach user to request (same shape as JWT guard)
    (request as Request & { user: { id: string; email: string } }).user = user;
    return true;
  }
}
