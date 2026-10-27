/* eslint-disable @typescript-eslint/no-require-imports */
import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import {
  Global,
  Module,
  ServiceUnavailableException,
  Type,
} from '@nestjs/common';
import { GoogleStrategy } from './google.strategy';
import {
  GoogleConfiguredGuard,
  getGoogleStrategyProviders,
  isGoogleConfigured,
} from './google-strategy.provider';
import { validateEnv } from '../config/env.validation';

const mockPool = { query: jest.fn() };

@Global()
@Module({
  providers: [{ provide: 'DATABASE_POOL', useValue: mockPool }],
  exports: ['DATABASE_POOL'],
})
class MockDatabaseModule {}

describe('AuthModule and Google Provider', () => {
  const originalEnv = { ...process.env };
  const validSecret32 = 'a-very-long-secret-key-that-is-at-least-32-chars';

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = { ...originalEnv };
  });

  describe('isGoogleConfigured and getGoogleStrategyProviders', () => {
    it('returns false and empty provider array in development when GOOGLE_* vars are missing', () => {
      const env: NodeJS.ProcessEnv = {
        NODE_ENV: 'development',
        JWT_SECRET: validSecret32,
      };

      expect(isGoogleConfigured(env)).toBe(false);
      expect(getGoogleStrategyProviders(env)).toEqual([]);
    });

    it('returns false when only partial GOOGLE_* vars are present', () => {
      const partialEnv: NodeJS.ProcessEnv = {
        NODE_ENV: 'development',
        JWT_SECRET: validSecret32,
        GOOGLE_CLIENT_ID: 'client-id-only',
      };

      expect(isGoogleConfigured(partialEnv)).toBe(false);
      expect(getGoogleStrategyProviders(partialEnv)).toEqual([]);
    });

    it('returns true and includes GoogleStrategy provider when all 3 GOOGLE_* vars are present', () => {
      const fullEnv: NodeJS.ProcessEnv = {
        NODE_ENV: 'development',
        JWT_SECRET: validSecret32,
        GOOGLE_CLIENT_ID: 'test-client-id',
        GOOGLE_CLIENT_SECRET: 'test-client-secret',
        GOOGLE_CALLBACK_URL: 'https://jedana.app/api/auth/google/callback',
      };

      expect(isGoogleConfigured(fullEnv)).toBe(true);
      expect(getGoogleStrategyProviders(fullEnv)).toEqual([GoogleStrategy]);
    });
  });

  describe('GoogleConfiguredGuard', () => {
    it('throws ServiceUnavailableException (503) when Google OAuth is not configured', () => {
      delete process.env.GOOGLE_CLIENT_ID;
      delete process.env.GOOGLE_CLIENT_SECRET;
      delete process.env.GOOGLE_CALLBACK_URL;

      const guard = new GoogleConfiguredGuard();
      expect(() => guard.canActivate()).toThrow(ServiceUnavailableException);
      expect(() => guard.canActivate()).toThrow(
        'Google OAuth is not configured on this server',
      );
    });

    it('returns true when Google OAuth is fully configured', () => {
      process.env.GOOGLE_CLIENT_ID = 'test-client-id';
      process.env.GOOGLE_CLIENT_SECRET = 'test-client-secret';
      process.env.GOOGLE_CALLBACK_URL =
        'https://jedana.app/api/auth/google/callback';

      const guard = new GoogleConfiguredGuard();
      expect(guard.canActivate()).toBe(true);
    });
  });

  describe('AuthModule provider registration', () => {
    it('does not register GoogleStrategy provider in development without Google credentials', async () => {
      process.env.NODE_ENV = 'development';
      process.env.JWT_SECRET = validSecret32;
      delete process.env.GOOGLE_CLIENT_ID;
      delete process.env.GOOGLE_CLIENT_SECRET;
      delete process.env.GOOGLE_CALLBACK_URL;

      let AuthModuleClass!: Type<unknown>;
      let StrategyClass!: Type<unknown>;
      jest.isolateModules(() => {
        AuthModuleClass = (
          require('./auth.module') as { AuthModule: Type<unknown> }
        ).AuthModule;

        StrategyClass = (
          require('./google.strategy') as { GoogleStrategy: Type<unknown> }
        ).GoogleStrategy;
      });

      const moduleRef: TestingModule = await Test.createTestingModule({
        imports: [
          MockDatabaseModule,
          ConfigModule.forRoot({
            isGlobal: true,
            ignoreEnvFile: true,
            load: [() => ({ ...process.env })],
          }),
          AuthModuleClass,
        ],
      }).compile();

      expect(() => moduleRef.get(StrategyClass, { strict: false })).toThrow();
    });

    it('registers GoogleStrategy provider when all GOOGLE_* variables are set', async () => {
      process.env.NODE_ENV = 'development';
      process.env.JWT_SECRET = validSecret32;
      process.env.GOOGLE_CLIENT_ID = 'test-client-id';
      process.env.GOOGLE_CLIENT_SECRET = 'test-client-secret';
      process.env.GOOGLE_CALLBACK_URL =
        'https://jedana.app/api/auth/google/callback';

      let AuthModuleClass!: Type<unknown>;
      let StrategyClass!: Type<unknown>;
      jest.isolateModules(() => {
        AuthModuleClass = (
          require('./auth.module') as { AuthModule: Type<unknown> }
        ).AuthModule;

        StrategyClass = (
          require('./google.strategy') as { GoogleStrategy: Type<unknown> }
        ).GoogleStrategy;
      });

      const moduleRef: TestingModule = await Test.createTestingModule({
        imports: [
          MockDatabaseModule,
          ConfigModule.forRoot({
            isGlobal: true,
            ignoreEnvFile: true,
            load: [() => ({ ...process.env })],
          }),
          AuthModuleClass,
        ],
      }).compile();

      const strategy = moduleRef.get(StrategyClass, { strict: false });
      expect(strategy).toBeDefined();
    });
  });

  describe('production boot validation', () => {
    it('still rejects production boot when Google credentials are missing', () => {
      expect(() =>
        validateEnv({
          NODE_ENV: 'production',
          JWT_SECRET: validSecret32,
          FRONTEND_URL: 'https://jedana.app',
        }),
      ).toThrow(/Invalid environment configuration/);
    });
  });
});
