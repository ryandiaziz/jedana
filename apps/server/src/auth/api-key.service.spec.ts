import { ApiKeyService } from './api-key.service';
import { Pool } from 'pg';

describe('ApiKeyService', () => {
  let service: ApiKeyService;
  let pool: {
    query: jest.Mock;
  };

  beforeEach(() => {
    pool = {
      query: jest.fn(),
    };
    service = new ApiKeyService(pool as unknown as Pool);
  });

  it('stores a sha256 hash, never the plaintext key', async () => {
    pool.query.mockResolvedValueOnce({
      rows: [
        {
          id: 'k1',
          name: 'cli',
          key_prefix: 'jdn_abcd',
          last_used_at: null,
          created_at: new Date().toISOString(),
          is_revoked: false,
        },
      ],
    });

    const { plainKey } = await service.generateKey('u1', 'cli');

    const params = pool.query.mock.calls[0][1] as unknown[];
    expect(plainKey.startsWith('jdn_')).toBe(true);
    expect(params[2]).toMatch(/^[a-f0-9]{64}$/); // key_hash
    expect(params[2]).not.toContain(plainKey); // plaintext tidak disimpan
  });

  it('validateKey returns the owning user', async () => {
    pool.query.mockImplementation((sql: string) => {
      if (sql.includes('SELECT ak.id AS key_id')) {
        return Promise.resolve({ rows: [{ key_id: 'k1', user_id: 'u1' }] });
      }
      if (sql.includes('UPDATE api_keys SET last_used_at')) {
        return Promise.resolve({ rowCount: 1 });
      }
      if (sql.includes('SELECT id, email FROM users')) {
        return Promise.resolve({
          rows: [{ id: 'u1', email: 'user@example.com' }],
        });
      }
      return Promise.resolve({ rows: [] });
    });

    const user = await service.validateKey('jdn_validkey123');
    expect(user).toEqual({ id: 'u1', email: 'user@example.com' });
  });

  it('validateKey returns null for an unknown or revoked key', async () => {
    pool.query.mockResolvedValueOnce({ rows: [] });
    const user = await service.validateKey('jdn_unknown_or_revoked');
    expect(user).toBeNull();
  });

  it('validateKey returns null if user record is not found', async () => {
    pool.query.mockImplementation((sql: string) => {
      if (sql.includes('SELECT ak.id AS key_id')) {
        return Promise.resolve({ rows: [{ key_id: 'k1', user_id: 'u1' }] });
      }
      if (sql.includes('UPDATE api_keys SET last_used_at')) {
        return Promise.resolve({ rowCount: 1 });
      }
      if (sql.includes('SELECT id, email FROM users')) {
        return Promise.resolve({ rows: [] });
      }
      return Promise.resolve({ rows: [] });
    });

    const user = await service.validateKey('jdn_orphaned_key');
    expect(user).toBeNull();
  });

  it('revokeKey is scoped to the owner', async () => {
    pool.query.mockResolvedValueOnce({ rowCount: 1 });
    const resultTrue = await service.revokeKey('u1', 'k1');
    expect(resultTrue).toBe(true);

    const [sql, params] = pool.query.mock.calls[0];
    expect(sql).toContain('user_id');
    expect(params).toEqual(['k1', 'u1']);

    pool.query.mockResolvedValueOnce({ rowCount: 0 });
    const resultFalse = await service.revokeKey('u1', 'k_other');
    expect(resultFalse).toBe(false);
  });

  it('listKeys returns records scoped to user without exposing hashes', async () => {
    const mockKeys = [
      {
        id: 'k1',
        name: 'cli',
        key_prefix: 'jdn_abcd',
        last_used_at: null,
        created_at: new Date().toISOString(),
        is_revoked: false,
      },
    ];
    pool.query.mockResolvedValueOnce({ rows: mockKeys });

    const keys = await service.listKeys('u1');
    expect(keys).toEqual([
      {
        id: 'k1',
        name: 'cli',
        keyPrefix: 'jdn_abcd',
        lastUsedAt: null,
        createdAt: mockKeys[0].created_at,
        isRevoked: false,
      },
    ]);
    expect(pool.query).toHaveBeenCalledWith(
      expect.stringContaining('WHERE user_id = $1'),
      ['u1'],
    );
  });
});
