// Runs before every Jest suite (jest.setupFiles). Never rely on the developer's .env.
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret-32-bytes-minimum-length!!';
process.env.DATABASE_URL ??= 'postgres://test:test@127.0.0.1:5432/test_db';
