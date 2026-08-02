import { describe, it, expect, beforeEach } from 'vitest';
import 'fake-indexeddb/auto';
import { db } from './db';

describe('Dexie IndexedDB Storage', () => {
  beforeEach(async () => {
    // Clear all tables before each test
    await Promise.all(db.tables.map(table => table.clear()));
  });

  it('should add and retrieve a wallet', async () => {
    const newWallet = {
      id: 'w-test-1',
      name: 'Dana Liburan',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      isDeleted: false,
    };

    await db.wallets.put(newWallet);
    const retrieved = await db.wallets.where('id').equals('w-test-1').first();

    expect(retrieved).toBeDefined();
    expect(retrieved?.name).toBe('Dana Liburan');
  });

  it('should handle tag archiving correctly without hard deletion', async () => {
    const activeTag = {
      id: 't-1',
      name: 'Makanan',
      isArchived: false,
      createdAt: Date.now(),
    };

    await db.tags.put(activeTag);
    
    // Archive tag
    await db.tags.where('id').equals('t-1').modify({ isArchived: true });
    
    const archivedTag = await db.tags.where('id').equals('t-1').first();
    expect(archivedTag).toBeDefined();
    expect(archivedTag?.isArchived).toBe(true);

    // Verify query filtering for active tags
    const activeTags = await db.tags.filter(t => !t.isArchived).toArray();
    expect(activeTags).toHaveLength(0);
  });

  it('should physically wipe all tables during logout data wipe', async () => {
    await db.wallets.put({ id: 'w-1', name: 'Wallet 1', createdAt: Date.now() });
    await db.transactions.put({
      id: 'tx-1',
      walletId: 'w-1',
      type: 'EXPENSE',
      amount: 50000,
      date: Date.now(),
      note: 'Makan siang',
      createdAt: Date.now(),
    });

    let walletCount = await db.wallets.count();
    let txCount = await db.transactions.count();
    expect(walletCount).toBe(1);
    expect(txCount).toBe(1);

    // Execute physical wipe
    await Promise.all(db.tables.map(table => table.clear()));

    walletCount = await db.wallets.count();
    txCount = await db.transactions.count();
    expect(walletCount).toBe(0);
    expect(txCount).toBe(0);
  });
});
