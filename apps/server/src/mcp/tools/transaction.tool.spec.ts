import { TransactionTool } from './transaction.tool';

describe('TransactionTool', () => {
  let tool: TransactionTool;
  let mcpData: {
    createTransaction: jest.Mock;
    listTransactions: jest.Mock;
    voidTransaction: jest.Mock;
  };

  const validParams = {
    walletId: '11111111-1111-4111-8111-111111111111',
    type: 'EXPENSE' as const,
    amount: 50000,
    note: 'Makan siang',
  };

  const ctx = {
    getRawRequest: () => ({ user: { id: 'u1' } }),
  };

  const unauthCtx = {
    getRawRequest: () => ({}),
  };

  beforeEach(() => {
    mcpData = {
      createTransaction: jest.fn(),
      listTransactions: jest.fn(),
      voidTransaction: jest.fn(),
    };
    tool = new TransactionTool(mcpData as any);
  });

  describe('createTransaction', () => {
    it('refuses to run without an authenticated user', async () => {
      const res = await tool.createTransaction(validParams, unauthCtx as any);
      expect(res.isError).toBe(true);
      expect(res.content[0].text).toContain('User not authenticated');
      expect(mcpData.createTransaction).not.toHaveBeenCalled();
    });

    it('passes the userId from the MCP context, not from the payload', async () => {
      mcpData.createTransaction.mockResolvedValue({ id: 't1', amount: 50000 });
      const res = await tool.createTransaction(
        { ...validParams, userId: 'attacker' } as any,
        ctx as any,
      );
      expect(mcpData.createTransaction).toHaveBeenCalledWith(
        'u1',
        expect.objectContaining({ walletId: validParams.walletId }),
      );
      expect(JSON.parse(res.content[0].text).transaction.id).toBe('t1');
    });

    it('returns isError when the data service throws', async () => {
      mcpData.createTransaction.mockRejectedValue(
        new Error('Database connection failed'),
      );
      const res = await tool.createTransaction(validParams, ctx as any);
      expect(res.isError).toBe(true);
      expect(res.content[0].text).toContain('Database connection failed');
    });
  });

  describe('listTransactions', () => {
    it('refuses to run without an authenticated user', async () => {
      const res = await tool.listTransactions({}, unauthCtx as any);
      expect(res.isError).toBe(true);
      expect(mcpData.listTransactions).not.toHaveBeenCalled();
    });

    it('passes the userId from the MCP context', async () => {
      mcpData.listTransactions.mockResolvedValue([
        { id: 't1', amount: 50000, type: 'EXPENSE' },
      ]);
      const res = await tool.listTransactions(
        { walletId: 'w-1', limit: 10 },
        ctx as any,
      );
      expect(mcpData.listTransactions).toHaveBeenCalledWith('u1', {
        walletId: 'w-1',
        limit: 10,
        startDate: undefined,
        endDate: undefined,
        type: undefined,
      });
      const parsed = JSON.parse(res.content[0].text);
      expect(parsed.count).toBe(1);
      expect(parsed.transactions[0].id).toBe('t1');
    });

    it('returns isError when listTransactions throws', async () => {
      mcpData.listTransactions.mockRejectedValue(new Error('Query error'));
      const res = await tool.listTransactions({}, ctx as any);
      expect(res.isError).toBe(true);
      expect(res.content[0].text).toContain('Query error');
    });
  });

  describe('voidTransaction', () => {
    it('refuses to run without an authenticated user', async () => {
      const res = await tool.voidTransaction(
        { transactionId: 'tx-1' },
        unauthCtx as any,
      );
      expect(res.isError).toBe(true);
      expect(mcpData.voidTransaction).not.toHaveBeenCalled();
    });

    it('passes the userId from the MCP context and marks voided', async () => {
      mcpData.voidTransaction.mockResolvedValue(true);
      const res = await tool.voidTransaction(
        { transactionId: 'tx-1' },
        ctx as any,
      );
      expect(mcpData.voidTransaction).toHaveBeenCalledWith('u1', 'tx-1');
      expect(res.isError).toBeUndefined();
      expect(res.content[0].text).toContain('tx-1 berhasil di-void');
    });

    it('returns isError if transaction was not found or already voided', async () => {
      mcpData.voidTransaction.mockResolvedValue(false);
      const res = await tool.voidTransaction(
        { transactionId: 'tx-notfound' },
        ctx as any,
      );
      expect(res.isError).toBe(true);
      expect(res.content[0].text).toContain(
        'Transaksi tidak ditemukan atau sudah di-void',
      );
    });

    it('returns isError when voidTransaction throws', async () => {
      mcpData.voidTransaction.mockRejectedValue(new Error('Void failed'));
      const res = await tool.voidTransaction(
        { transactionId: 'tx-1' },
        ctx as any,
      );
      expect(res.isError).toBe(true);
      expect(res.content[0].text).toContain('Void failed');
    });
  });
});
