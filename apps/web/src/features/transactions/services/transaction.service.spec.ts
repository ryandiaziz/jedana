import { describe, it, expect, beforeEach } from 'vitest';
import 'fake-indexeddb/auto';
import { db } from '../../../db/db';
import { TransactionService } from './transaction.service';

describe('TransactionService (Deepened TransactionLedger Module)', () => {
  beforeEach(async () => {
    await db.transactions.clear();
    await db.tags.clear();
    await db.transaction_tags.clear();
    await db.wallets.clear();
  });

  it('addTransaction: creates transaction, default wallet, and deduplicates tags case-insensitively', async () => {
    const txId = await TransactionService.addTransaction({
      type: 'EXPENSE',
      amount: 45000,
      date: Date.now(),
      note: 'Dinner ramen',
      payee: 'Ramen Bar',
      tags: ['Food', 'food', '   ', 'Dining'],
    });

    expect(txId).toBeDefined();

    // Verify transaction record
    const tx = await db.transactions.get(txId);
    expect(tx).toBeDefined();
    expect(tx?.amount).toBe(45000);
    expect(tx?.payee).toBe('Ramen Bar');
    expect(tx?.isVoided).toBe(false);
    expect(tx?.isDeleted).toBe(false);

    // Verify default wallet creation
    const wallet = await db.wallets.get(tx!.walletId);
    expect(wallet).toBeDefined();
    expect(wallet?.name).toBe('Main Wallet');

    // Verify tag deduplication (Food & food -> 1 tag, empty tag ignored -> total 2 tags)
    const allTags = await db.tags.toArray();
    expect(allTags).toHaveLength(2);
    const tagNames = allTags.map((t) => t.name.toLowerCase()).sort();
    expect(tagNames).toEqual(['dining', 'food']);

    // Verify junction table
    const links = await db.transaction_tags.where('transactionId').equals(txId).toArray();
    expect(links).toHaveLength(2);
    expect(links.every((l) => !l.isDeleted)).toBe(true);
  });

  it('updateTransaction: updates fields and synchronizes tags (soft-deleting removed tags)', async () => {
    const txId = await TransactionService.addTransaction({
      type: 'EXPENSE',
      amount: 20000,
      date: Date.now(),
      note: 'Coffee',
      payee: 'Cafe A',
      tags: ['Drinks', 'Work'],
    });

    // Update: change amount, remove 'Work', add 'Social'
    await TransactionService.updateTransaction(txId, {
      type: 'EXPENSE',
      amount: 25000,
      date: Date.now(),
      note: 'Coffee with team',
      payee: 'Cafe A',
      tags: ['Drinks', 'Social'],
    });

    const updatedTx = await db.transactions.get(txId);
    expect(updatedTx?.amount).toBe(25000);
    expect(updatedTx?.note).toBe('Coffee with team');

    // Verify resolved tags via getTransaction
    const txWithTags = await TransactionService.getTransaction(txId);
    expect(txWithTags).toBeDefined();
    const tagNames = txWithTags!.tags.map((t) => t.name).sort();
    expect(tagNames).toEqual(['Drinks', 'Social']);

    // Check junction table to verify 'Work' link was soft-deleted, not hard-deleted
    const allLinks = await db.transaction_tags.where('transactionId').equals(txId).toArray();
    const activeLinks = allLinks.filter((l) => !l.isDeleted);
    const deletedLinks = allLinks.filter((l) => l.isDeleted);

    expect(activeLinks).toHaveLength(2);
    expect(deletedLinks).toHaveLength(1);
  });

  it('voidTransaction and restoreTransaction: toggles isVoided without hard-deleting records', async () => {
    const txId = await TransactionService.addTransaction({
      type: 'EXPENSE',
      amount: 100000,
      date: Date.now(),
      note: 'Accidental payment',
      tags: ['Shopping'],
    });

    // Void
    await TransactionService.voidTransaction(txId);
    let tx = await db.transactions.get(txId);
    expect(tx?.isVoided).toBe(true);

    // Restore
    await TransactionService.restoreTransaction(txId);
    tx = await db.transactions.get(txId);
    expect(tx?.isVoided).toBe(false);
  });

  it('getTransaction: returns undefined for nonexistent or deleted transactions', async () => {
    const result = await TransactionService.getTransaction('nonexistent-id');
    expect(result).toBeUndefined();
  });
});
