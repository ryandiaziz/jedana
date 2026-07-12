import {
  Controller,
  Post,
  Get,
  Body,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
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
    @Query('lastSync') lastSync?: string,
  ): Promise<Record<string, Array<Record<string, unknown>>>> {
    const userId = req.user.id;
    const dateParam = lastSync ? new Date(lastSync) : new Date(0);
    return this.syncService.pull(userId, dateParam);
  }
}
