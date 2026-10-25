import { UnauthorizedException } from '@nestjs/common';
import { JwtStrategy } from './jwt.strategy';
import { Pool } from 'pg';

describe('JwtStrategy', () => {
  let strategy: JwtStrategy;
  let pool: {
    query: jest.Mock;
  };
  let originalSecret: string | undefined;

  beforeAll(() => {
    originalSecret = process.env.JWT_SECRET;
    process.env.JWT_SECRET = 'test-secret-32-bytes-minimum-length!!';
  });

  afterAll(() => {
    if (originalSecret !== undefined) {
      process.env.JWT_SECRET = originalSecret;
    } else {
      delete process.env.JWT_SECRET;
    }
  });

  beforeEach(() => {
    pool = {
      query: jest.fn(),
    };
    strategy = new JwtStrategy(pool as unknown as Pool);
  });

  it('validate returns the user for a known subject', async () => {
    pool.query.mockResolvedValueOnce({ rows: [{ id: 'u1', email: 'a@b.c' }] });
    await expect(strategy.validate({ sub: 'u1' })).resolves.toEqual({
      id: 'u1',
      email: 'a@b.c',
    });
    expect(pool.query).toHaveBeenCalledWith(
      expect.stringContaining('SELECT * FROM users WHERE id = $1'),
      ['u1'],
    );
  });

  it('validate throws UnauthorizedException when the user is gone', async () => {
    pool.query.mockResolvedValueOnce({ rows: [] });
    await expect(strategy.validate({ sub: 'deleted' })).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
    expect(pool.query).toHaveBeenCalledWith(
      expect.stringContaining('SELECT * FROM users WHERE id = $1'),
      ['deleted'],
    );
  });
});
