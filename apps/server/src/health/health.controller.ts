import { Controller, Get, Inject } from '@nestjs/common';
import type { Pool } from 'pg';

@Controller('health')
export class HealthController {
  constructor(@Inject('DATABASE_POOL') private readonly pool: Pool) {}

  @Get()
  async check() {
    let dbStatus = 'disconnected';
    try {
      await this.pool.query('SELECT 1');
      dbStatus = 'connected';
    } catch {
      dbStatus = 'error';
    }

    return {
      status: dbStatus === 'connected' ? 'ok' : 'degraded',
      timestamp: new Date().toISOString(),
      database: dbStatus,
      uptime: process.uptime(),
    };
  }
}
