import {
  Controller,
  Post,
  Get,
  Body,
  Query,
  Req,
  Res,
  BadRequestException,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import { SyncService } from './sync.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('sync')
@UseGuards(JwtAuthGuard)
export class SyncController {
  constructor(private readonly syncService: SyncService) {}

  @Post('push')
  async push(
    @Req() req: { user: { id: string } },
    @Body() body: Record<string, Array<Record<string, unknown>>>,
  ): Promise<{ success: boolean }> {
    const userId = req.user.id;
    return this.syncService.push(userId, body);
  }

  @Get('pull')
  async pull(
    @Req() req: { user: { id: string } },
    @Res({ passthrough: true }) res: Response,
    @Query('since') since?: string,
    @Query('lastSync') legacyLastSync?: string,
  ): Promise<Record<string, Array<Record<string, unknown>>>> {
    const userId = req.user.id;
    const raw = since ?? legacyLastSync;
    let sinceDate = new Date(0);
    if (raw) {
      const parsed = new Date(raw);
      if (Number.isNaN(parsed.getTime())) {
        throw new BadRequestException('Invalid sync cursor');
      }
      sinceDate = parsed;
    }

    const { data, cursor } = await this.syncService.pull(userId, sinceDate);
    res.setHeader('X-Sync-Cursor', cursor.toISOString());
    return data;
  }
}
