import { validateEnv } from './env.validation';

describe('validateEnv', () => {
  const validSecret32 = 'a-very-long-secret-key-that-is-at-least-32-chars';

  it('throws when NODE_ENV is production and JWT_SECRET is missing, with JWT_SECRET in message', () => {
    expect(() =>
      validateEnv({
        NODE_ENV: 'production',
        GOOGLE_CLIENT_ID: 'test-client-id',
        GOOGLE_CLIENT_SECRET: 'test-client-secret',
        GOOGLE_CALLBACK_URL: 'https://example.com/callback',
        FRONTEND_URL: 'https://example.com',
      }),
    ).toThrow(/JWT_SECRET/);
  });

  it('throws when JWT_SECRET is 24 characters (less than 32), with at least 32 in message', () => {
    const secret24 = '123456789012345678901234';
    expect(() =>
      validateEnv({
        NODE_ENV: 'development',
        JWT_SECRET: secret24,
      }),
    ).toThrow(/at least 32/);
  });

  it('passes in development with 32+ char JWT_SECRET without Google OAuth variables', () => {
    const config = {
      NODE_ENV: 'development',
      JWT_SECRET: validSecret32,
    };
    const result = validateEnv(config);
    expect(result.JWT_SECRET).toBe(validSecret32);
    expect(result.NODE_ENV).toBe('development');
    expect(result.PORT).toBe(3000);
    expect(result.JWT_EXPIRES_IN).toBe('7d');
  });

  it('passes in production when all required variables are set with https URLs and returns parsed data', () => {
    const config = {
      NODE_ENV: 'production',
      PORT: '8080',
      JWT_SECRET: validSecret32,
      GOOGLE_CLIENT_ID: 'google-client-id-123',
      GOOGLE_CLIENT_SECRET: 'google-client-secret-xyz',
      GOOGLE_CALLBACK_URL: 'https://api.jedana.app/api/auth/google/callback',
      FRONTEND_URL: 'https://jedana.app',
      DATABASE_URL: 'postgres://user:pass@host:5432/db',
    };
    const result = validateEnv(config);
    expect(result.NODE_ENV).toBe('production');
    expect(result.PORT).toBe(8080);
    expect(result.JWT_SECRET).toBe(validSecret32);
    expect(result.GOOGLE_CLIENT_ID).toBe('google-client-id-123');
    expect(result.GOOGLE_CLIENT_SECRET).toBe('google-client-secret-xyz');
    expect(result.GOOGLE_CALLBACK_URL).toBe(
      'https://api.jedana.app/api/auth/google/callback',
    );
    expect(result.FRONTEND_URL).toBe('https://jedana.app');
    expect(result.DATABASE_URL).toBe('postgres://user:pass@host:5432/db');
  });

  it('throws in production when callback URL or frontend URL is not https', () => {
    expect(() =>
      validateEnv({
        NODE_ENV: 'production',
        JWT_SECRET: validSecret32,
        GOOGLE_CLIENT_ID: 'test-client-id',
        GOOGLE_CLIENT_SECRET: 'test-client-secret',
        GOOGLE_CALLBACK_URL: 'http://example.com/callback',
        FRONTEND_URL: 'https://example.com',
      }),
    ).toThrow(/Invalid environment configuration/);
  });
});
