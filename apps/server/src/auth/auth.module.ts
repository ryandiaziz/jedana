import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { ApiKeyController } from './api-key.controller';
import { GoogleStrategy } from './google.strategy';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { JwtStrategy } from './jwt.strategy';
import { ConfigModule } from '@nestjs/config';
import { ApiKeyService } from './api-key.service';
import { ApiKeyGuard } from './api-key.guard';

@Module({
  imports: [
    ConfigModule.forRoot(),
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'fallback-secret',
      signOptions: { expiresIn: '7d' },
    }),
  ],
  controllers: [AuthController, ApiKeyController],
  providers: [GoogleStrategy, JwtStrategy, ApiKeyService, ApiKeyGuard],
  exports: [ApiKeyService, ApiKeyGuard],
})
export class AuthModule {}
