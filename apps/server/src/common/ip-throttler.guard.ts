import { Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import { getClientIp } from './client-ip';

/**
 * Throttler guard that tracks requests by the client's real IP address
 * extracted via getClientIp (ADR-0008).
 */
@Injectable()
export class IpThrottlerGuard extends ThrottlerGuard {
  protected async getTracker(req: Record<string, unknown>): Promise<string> {
    return getClientIp(req as never);
  }
}
