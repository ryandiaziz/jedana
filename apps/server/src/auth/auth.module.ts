import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { ApiKeyController } from './api-key.controller';
import { GoogleStrategy } from './google.strategy';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { JwtStrategy } from './jwt.strategy';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ApiKeyService } from './api-key.service';
import { ApiKeyGuard } from './api-key.guard';
import {
  GoogleConfiguredGuard,
  isGoogleConfigured,
} from './google-strategy.provider';

const googleConfigured = isGoogleConfigured();

@Module({
  imports: [
    ConfigModule,
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.getOrThrow<string>('JWT_SECRET'),
        signOptions: {
          expiresIn: (config.get<string>('JWT_EXPIRES_IN') ?? '7d') as any,
        },
      }),
    }),
  ],
  controllers: [AuthController, ApiKeyController],
  providers: [
    JwtStrategy,
    ApiKeyService,
    ApiKeyGuard,
    GoogleConfiguredGuard,
    ...(googleConfigured ? [GoogleStrategy] : []),
  ],
  exports: [ApiKeyService, ApiKeyGuard],
})
export class AuthModule {}
