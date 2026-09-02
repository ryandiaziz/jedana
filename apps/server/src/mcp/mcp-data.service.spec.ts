import { McpDataService } from './mcp-data.service';
import { Pool } from 'pg';

describe('McpDataService', () => {
  let service: McpDataService;
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

    service = new McpDataService(mockPool as unknown as Pool);
  });

  describe('createWallet', () => {
    it('should return existing wallet if active wallet with same name already exists', async () => {
      mockPool.query.mockResolvedValueOnce({
        rows: [{ id: 'w-existing-1', name: 'Dompet Utama' }],
      });

      const result = await service.createWallet('user-1', 'dompet UTAMA');

      expect(result).toEqual({
        id: 'w-existing-1',
        name: 'Dompet Utama',
        isExisting: true,
      });
      expect(mockPool.query).toHaveBeenCalledTimes(1);
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT id, name FROM wallets'),
        ['user-1', 'dompet UTAMA'],
      );
    });

    it('should create new wallet if active wallet with same name does not exist', async () => {
      mockPool.query
        .mockResolvedValueOnce({ rows: [] }) // SELECT
        .mockResolvedValueOnce({ rows: [] }); // INSERT

      const result = await service.createWallet('user-1', 'Dana Darurat');

      expect(result.name).toBe('Dana Darurat');
      expect(result.id).toBeDefined();
      expect(result.isExisting).toBe(false);
      expect(mockPool.query).toHaveBeenCalledTimes(2);
      expect(mockPool.query).toHaveBeenNthCalledWith(
        2,
        expect.stringContaining('INSERT INTO wallets'),
        expect.arrayContaining([result.id, 'user-1', 'Dana Darurat']),
      );
    });

    it('should handle concurrent create_wallet (23505 unique error) gracefully and return existing wallet', async () => {
      // First SELECT returns empty (passes check)
      // INSERT throws 23505 (simulating concurrent insert from another request)
      // Re-SELECT returns the row created by the other request
      const err23505 = new Error('duplicate key') as any;
      err23505.code = '23505';

      mockPool.query
        .mockResolvedValueOnce({ rows: [] }) // initial check
        .mockRejectedValueOnce(err23505) // insert collision
        .mockResolvedValueOnce({ rows: [{ id: 'w-winner-id', name: 'Dana Liburan' }] }); // re-select

      const result = await service.createWallet('user-1', 'Dana Liburan');

      expect(result).toEqual({
        id: 'w-winner-id',
        name: 'Dana Liburan',
        isExisting: true,
      });
    });
  });

  describe('createTag', () => {
    it('should return existing tag if active tag with same name already exists', async () => {
      mockPool.query.mockResolvedValueOnce({
        rows: [{ id: 't-existing-1', name: 'Makanan' }],
      });

      const result = await service.createTag('user-1', 'makanan');

      expect(result).toEqual({
        id: 't-existing-1',
        name: 'Makanan',
        isExisting: true,
      });
      expect(mockPool.query).toHaveBeenCalledTimes(1);
    });

    it('should create new tag if not found', async () => {
      mockPool.query
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] });

      const result = await service.createTag('user-1', 'Liburan');

      expect(result.name).toBe('Liburan');
      expect(result.id).toBeDefined();
      expect(result.isExisting).toBe(false);
      expect(mockPool.query).toHaveBeenCalledTimes(2);
    });

    it('should handle concurrent create_tag (23505 unique error) gracefully and return existing tag', async () => {
      const err23505 = new Error('duplicate key') as any;
      err23505.code = '23505';

      mockPool.query
        .mockResolvedValueOnce({ rows: [] })
        .mockRejectedValueOnce(err23505)
        .mockResolvedValueOnce({ rows: [{ id: 't-winner-id', name: 'Transport' }] });

      const result = await service.createTag('user-1', 'Transport');

      expect(result).toEqual({
        id: 't-winner-id',
        name: 'Transport',
        isExisting: true,
      });
    });
  });
});
