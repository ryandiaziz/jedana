import { SyncService } from './sync.service';
import { Pool } from 'pg';

describe('SyncService', () => {
  let service: SyncService;
  let mockPool: {
    connect: jest.Mock;
    query: jest.Mock;
  };
  let mockClient: {
    query: jest.Mock;
    release: jest.Mock;
  };

  beforeEach(() => {
    mockClient = {
      query: jest.fn().mockResolvedValue({ rows: [] }),
      release: jest.fn(),
    };
    mockPool = {
      connect: jest.fn().mockResolvedValue(mockClient),
      query: jest.fn().mockResolvedValue({ rows: [] }),
    };

    service = new SyncService(mockPool as unknown as Pool);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('pull', () => {
    it('should query all schemas and map snake_case to camelCase', async () => {
      const mockWallets = [
        {
          id: 'w1',
          user_id: 'u1',
          name: 'Dana Harian',
          is_deleted: false,
          created_at: new Date('2026-01-01'),
          updated_at: new Date('2026-01-01'),
        },
      ];

      mockPool.query.mockImplementation((query: string) => {
        if (query.includes('FROM wallets')) {
          return Promise.resolve({ rows: mockWallets });
        }
        return Promise.resolve({ rows: [] });
      });

      const result = await service.pull('u1', new Date(0));
      expect(result.wallets).toHaveLength(1);
      expect(result.wallets[0]).toEqual({
        id: 'w1',
        userId: 'u1',
        name: 'Dana Harian',
        isDeleted: false,
        createdAt: new Date('2026-01-01').getTime(),
        updatedAt: new Date('2026-01-01').getTime(),
      });
    });
  });

  describe('push', () => {
    it('should execute BEGIN, insert/upsert queries, and COMMIT', async () => {
      const pushData = {
        wallets: [
          {
            id: 'w1',
            name: 'Dana Liburan',
            createdAt: Date.now(),
            updatedAt: Date.now(),
          },
        ],
      };

      const result = await service.push('u1', pushData);

      expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
      expect(mockClient.release).toHaveBeenCalled();
      expect(result).toEqual({ success: true });
    });

    it('should ROLLBACK on database error', async () => {
      mockClient.query.mockImplementation((sql: string) => {
        if (sql === 'BEGIN') return Promise.resolve();
        if (sql.includes('INSERT INTO')) throw new Error('DB Error');
        return Promise.resolve();
      });

      const pushData = {
        wallets: [
          {
            id: 'w1',
            name: 'Error Wallet',
            createdAt: Date.now(),
            updatedAt: Date.now(),
          },
        ],
      };

      await expect(service.push('u1', pushData)).rejects.toThrow('DB Error');
      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
      expect(mockClient.release).toHaveBeenCalled();
    });
  });
});
