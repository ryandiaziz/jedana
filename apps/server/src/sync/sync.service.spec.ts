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
    it('should query all schemas, returning tombstones and active records with camelCase mapping', async () => {
      const mockWallets = [
        {
          id: 'w-canonical',
          user_id: 'u1',
          name: 'Dana Harian',
          is_deleted: false,
          created_at: new Date('2026-01-01'),
          updated_at: new Date('2026-01-01'),
        },
        {
          id: 'w-tombstone',
          user_id: 'u1',
          name: 'Dana Harian',
          is_deleted: true,
          created_at: new Date('2026-01-01'),
          updated_at: new Date('2026-01-02'),
        },
      ];

      mockPool.query.mockImplementation((query: string) => {
        if (query.includes('FROM wallets')) {
          return Promise.resolve({ rows: mockWallets });
        }
        return Promise.resolve({ rows: [] });
      });

      const result = await service.pull('u1', new Date(0));
      expect(result.wallets).toHaveLength(2);
      expect(result.wallets[0]).toEqual({
        id: 'w-canonical',
        userId: 'u1',
        name: 'Dana Harian',
        isDeleted: false,
        createdAt: new Date('2026-01-01').getTime(),
        updatedAt: new Date('2026-01-01').getTime(),
      });
      expect(result.wallets[1]).toEqual({
        id: 'w-tombstone',
        userId: 'u1',
        name: 'Dana Harian',
        isDeleted: true,
        createdAt: new Date('2026-01-01').getTime(),
        updatedAt: new Date('2026-01-02').getTime(),
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

    it('should upsert tombstone when duplicate wallet is pushed in Batch 1 and remap transaction in same batch', async () => {
      mockClient.query.mockImplementation((sql: string) => {
        if (sql === 'BEGIN' || sql === 'COMMIT') return Promise.resolve();
        // SELECT to check duplicate active wallet
        if (
          sql.includes('SELECT id FROM wallets') &&
          sql.includes('is_deleted = FALSE')
        ) {
          return Promise.resolve({ rows: [{ id: 'w-canonical' }] });
        }
        // Target wallet check for transaction
        if (
          sql.includes('SELECT id, name, is_deleted FROM wallets WHERE id = $1')
        ) {
          return Promise.resolve({
            rows: [
              { id: 'w-duplicate', name: 'Dana Harian', is_deleted: true },
            ],
          });
        }
        return Promise.resolve({ rows: [] });
      });

      const pushData = {
        wallets: [
          {
            id: 'w-duplicate',
            name: 'Dana Harian',
            createdAt: Date.now(),
            updatedAt: Date.now(),
          },
        ],
        transactions: [
          {
            id: 'tx1',
            walletId: 'w-duplicate',
            type: 'EXPENSE',
            amount: 50000,
            date: Date.now(),
            createdAt: Date.now(),
            updatedAt: Date.now(),
          },
        ],
      };

      const result = await service.push('u1', pushData);
      expect(result).toEqual({ success: true });

      // Verify that w-duplicate was saved as tombstone (is_deleted = TRUE)
      const tombstoneCall = mockClient.query.mock.calls.find(
        (call) =>
          call[0].includes('INSERT INTO wallets') &&
          call[1] &&
          call[1].includes('w-duplicate'),
      );
      expect(tombstoneCall).toBeDefined();
      expect(tombstoneCall[0]).toContain('TRUE');

      // Verify that the transaction was remapped to w-canonical
      const insertTxCall = mockClient.query.mock.calls.find((call) =>
        call[0].includes('INSERT INTO transactions'),
      );
      expect(insertTxCall).toBeDefined();
      expect(insertTxCall[1]).toContain('w-canonical');
    });

    it('should statelessly remap transaction in Batch 2 when only transaction is sent with tombstone wallet ID', async () => {
      mockClient.query.mockImplementation((sql: string) => {
        if (sql === 'BEGIN' || sql === 'COMMIT') return Promise.resolve();
        // Target wallet check for transaction finds tombstone record
        if (
          sql.includes('SELECT id, name, is_deleted FROM wallets WHERE id = $1')
        ) {
          return Promise.resolve({
            rows: [
              { id: 'w-tombstone-1', name: 'Dana Harian', is_deleted: true },
            ],
          });
        }
        // Active canonical search for same name
        if (
          sql.includes('SELECT id FROM wallets') &&
          sql.includes('LOWER(name) = LOWER($2) AND is_deleted = FALSE')
        ) {
          return Promise.resolve({ rows: [{ id: 'w-canonical-1' }] });
        }
        return Promise.resolve({ rows: [] });
      });

      // Batch 2 sends ONLY transactions (no wallets table in payload)
      const pushData = {
        transactions: [
          {
            id: 'tx2',
            walletId: 'w-tombstone-1',
            type: 'EXPENSE',
            amount: 75000,
            date: Date.now(),
            createdAt: Date.now(),
            updatedAt: Date.now(),
          },
        ],
      };

      const result = await service.push('u1', pushData);
      expect(result).toEqual({ success: true });

      const insertTxCall = mockClient.query.mock.calls.find((call) =>
        call[0].includes('INSERT INTO transactions'),
      );
      expect(insertTxCall).toBeDefined();
      expect(insertTxCall[1]).toContain('w-canonical-1');
      expect(insertTxCall[1]).not.toContain('w-tombstone-1');
    });

    it('should throw explicit error when transaction targets deleted wallet with NO active counterpart', async () => {
      mockClient.query.mockImplementation((sql: string) => {
        if (sql === 'BEGIN' || sql === 'COMMIT') return Promise.resolve();
        if (
          sql.includes('SELECT id, name, is_deleted FROM wallets WHERE id = $1')
        ) {
          return Promise.resolve({
            rows: [{ id: 'w-deleted', name: 'Old Wallet', is_deleted: true }],
          });
        }
        if (
          sql.includes('SELECT id FROM wallets') &&
          sql.includes('is_deleted = FALSE')
        ) {
          return Promise.resolve({ rows: [] }); // No active counterpart found
        }
        return Promise.resolve({ rows: [] });
      });

      const pushData = {
        transactions: [
          {
            id: 'tx-orphan',
            walletId: 'w-deleted',
            type: 'EXPENSE',
            amount: 20000,
            date: Date.now(),
            createdAt: Date.now(),
            updatedAt: Date.now(),
          },
        ],
      };

      await expect(service.push('u1', pushData)).rejects.toThrow(
        /Transaction validation error: Target wallet "Old Wallet".*is inactive and has no active canonical counterpart/,
      );
      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
    });

    it('should throw explicit error when transaction targets non-existent wallet ID', async () => {
      mockClient.query.mockImplementation((sql: string) => {
        if (sql === 'BEGIN' || sql === 'COMMIT') return Promise.resolve();
        if (
          sql.includes('SELECT id, name, is_deleted FROM wallets WHERE id = $1')
        ) {
          return Promise.resolve({ rows: [] }); // Not found in DB
        }
        return Promise.resolve({ rows: [] });
      });

      const pushData = {
        transactions: [
          {
            id: 'tx-nonexistent',
            walletId: 'w-nonexistent',
            type: 'EXPENSE',
            amount: 20000,
            date: Date.now(),
            createdAt: Date.now(),
            updatedAt: Date.now(),
          },
        ],
      };

      await expect(service.push('u1', pushData)).rejects.toThrow(
        /Transaction validation error: Target wallet ID "w-nonexistent" does not exist/,
      );
      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
    });

    it('should catch 23505 race condition during wallet insert and save as tombstone', async () => {
      mockClient.query.mockImplementation((sql: string) => {
        if (sql === 'BEGIN' || sql === 'COMMIT') return Promise.resolve();
        if (sql.includes('SELECT id FROM wallets')) {
          return Promise.resolve({ rows: [] }); // Check initially passes
        }
        if (sql.includes('INSERT INTO wallets') && !sql.includes('TRUE')) {
          const err = new Error('duplicate key') as any;
          err.code = '23505';
          throw err;
        }
        return Promise.resolve({ rows: [] });
      });

      const pushData = {
        wallets: [
          {
            id: 'w-race',
            name: 'Dana Harian',
            createdAt: Date.now(),
            updatedAt: Date.now(),
          },
        ],
      };

      const result = await service.push('u1', pushData);
      expect(result).toEqual({ success: true });

      // Verify that tombstone insert was called upon catching 23505
      const tombstoneCalls = mockClient.query.mock.calls.filter(
        (call) =>
          call[0].includes('INSERT INTO wallets') &&
          call[1] &&
          call[1].includes('w-race'),
      );
      expect(tombstoneCalls).toHaveLength(2);
      expect(tombstoneCalls[1][0]).toContain('TRUE');
    });

    it('should ROLLBACK on unexpected database error', async () => {
      mockClient.query.mockImplementation((sql: string) => {
        if (sql === 'BEGIN') return Promise.resolve();
        if (sql.includes('INSERT INTO')) throw new Error('DB Error');
        return Promise.resolve({ rows: [] });
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
