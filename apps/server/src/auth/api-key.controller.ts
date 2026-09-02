import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Param,
  Req,
  UseGuards,
  HttpCode,
  HttpStatus,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiKeyService } from './api-key.service';

@Controller('auth/api-keys')
@UseGuards(AuthGuard('jwt'))
export class ApiKeyController {
  constructor(private readonly apiKeyService: ApiKeyService) {}

  @Post()
  async generateKey(
    @Req() req: { user: { id: string } },
    @Body('name') name: string,
  ) {
    if (!name || name.trim().length === 0) {
      throw new BadRequestException('API key name is required');
    }

    if (name.length > 100) {
      throw new BadRequestException(
        'API key name must be 100 characters or less',
      );
    }

    const { plainKey, record } = await this.apiKeyService.generateKey(
      req.user.id,
      name.trim(),
    );

    return { plainKey, ...record };
  }

  @Get()
  async listKeys(@Req() req: { user: { id: string } }) {
    return this.apiKeyService.listKeys(req.user.id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async revokeKey(
    @Req() req: { user: { id: string } },
    @Param('id') keyId: string,
  ) {
    const revoked = await this.apiKeyService.revokeKey(req.user.id, keyId);
    if (!revoked) {
      throw new NotFoundException('API key not found or already revoked');
    }
  }
}
