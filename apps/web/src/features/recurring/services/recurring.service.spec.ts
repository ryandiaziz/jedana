import { describe, it, expect, beforeEach } from 'vitest';
import 'fake-indexeddb/auto';
import { db } from '../../../db/db';
import { RecurringService } from './recurring.service';

describe('RecurringService', () => {
  beforeEach(async () => {
    await Promise.all(db.tables.map((table) => table.clear()));
    // Ensure default wallet exists
    await db.wallets.add({
      id: 'w-default',
      name: 'Dompet Utama',
      isDeleted: false,
      createdAt: Date.now(),
    });
  });

  it('should add, update, toggle, and delete a recurring rule', async () => {
    // 1. Add
    const id = await RecurringService.addRecurring({
      walletId: 'w-default',
      type: 'EXPENSE',
      amount: 150000,
      note: 'Internet Indihome',
      payee: 'Telkom',
      tags: ['Bills', 'Utilities'],
      frequency: 'MONTHLY',
      dayOfMonth: 20,
      startDate: Date.now() + 100000, // Future date, should not generate yet
    });

    expect(id).toBeDefined();
    const stored = await db.recurring_transactions.get(id);
    expect(stored?.note).toBe('Internet Indihome');
    expect(stored?.amount).toBe(150000);
    expect(stored?.isActive).toBe(true);

    // 2. Update
    await RecurringService.updateRecurring(id, {
      amount: 175000,
      note: 'Internet Indihome 50Mbps',
    });
    const updated = await db.recurring_transactions.get(id);
    expect(updated?.amount).toBe(175000);
    expect(updated?.note).toBe('Internet Indihome 50Mbps');

    // 3. Toggle
    await RecurringService.toggleActive(id, false);
    const toggled = await db.recurring_transactions.get(id);
    expect(toggled?.isActive).toBe(false);

    // 4. Delete
    await RecurringService.deleteRecurring(id);
    const deleted = await db.recurring_transactions.get(id);
    expect(deleted?.isDeleted).toBe(true);
  });

  it('should automatically generate due recurring transactions without duplicates', async () => {
    const today = new Date();
    // Rule started 2 days ago, daily frequency
    const twoDaysAgo = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 2, 8, 0).getTime();

    await db.recurring_transactions.add({
      id: 'rec-daily-test',
      walletId: 'w-default',
      type: 'EXPENSE',
      amount: 25000,
      note: 'Kopi Pagi',
      tags: ['Food'],
      frequency: 'DAILY',
      startDate: twoDaysAgo,
      isActive: true,
      isDeleted: false,
      createdAt: twoDaysAgo,
      updatedAt: twoDaysAgo,
    });

    // Run generator
    const { generatedCount } = await RecurringService.generateDueTransactions();
    expect(generatedCount).toBeGreaterThanOrEqual(2);

    const txs = await db.transactions.filter((t) => t.note === 'Kopi Pagi').toArray();
    expect(txs.length).toBe(generatedCount);

    // Verify lastGeneratedDate updated
    const updatedRule = await db.recurring_transactions.get('rec-daily-test');
    expect(updatedRule?.lastGeneratedDate).toBeDefined();

    // Run generator second time -> must be idempotent (0 generated)
    const secondRun = await RecurringService.generateDueTransactions();
    expect(secondRun.generatedCount).toBe(0);
  });

  it('should not create duplicates when called concurrently', async () => {
    const today = new Date();
    const threeDaysAgo = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 3, 8, 0).getTime();

    await db.recurring_transactions.add({
      id: 'rec-concurrent-test',
      walletId: 'w-default',
      type: 'EXPENSE',
      amount: 15000,
      note: 'Snack Sore',
      tags: ['Snacks'],
      frequency: 'DAILY',
      startDate: threeDaysAgo,
      isActive: true,
      isDeleted: false,
      createdAt: threeDaysAgo,
      updatedAt: threeDaysAgo,
    });

    // Run generator concurrently
    const [run1, run2] = await Promise.all([
      RecurringService.generateDueTransactions(),
      RecurringService.generateDueTransactions(),
    ]);

    expect(run1.generatedCount).toBe(run2.generatedCount);

    const txs = await db.transactions.filter((t) => t.note === 'Snack Sore').toArray();
    expect(txs.length).toBe(run1.generatedCount);
  });

  it('should not recreate transactions if matching transactions already exist even if lastGeneratedDate is unset', async () => {
    const targetDate = new Date(2026, 10, 1, 9, 0, 0, 0).getTime(); // Nov 1, 2026

    // Pre-existing transaction in DB
    await db.transactions.add({
      id: 'tx-existing-1',
      walletId: 'w-default',
      type: 'EXPENSE',
      amount: 27000,
      date: targetDate,
      note: 'Tagihan Youtube Premium',
      payee: 'Youtube',
      isVoided: false,
      isDeleted: false,
      createdAt: targetDate,
      updatedAt: targetDate,
    });

    // Rule with lastGeneratedDate undefined
    await db.recurring_transactions.add({
      id: 'rec-youtube',
      walletId: 'w-default',
      type: 'EXPENSE',
      amount: 27000,
      note: 'Tagihan Youtube Premium',
      payee: 'Youtube',
      tags: ['Subscription'],
      frequency: 'MONTHLY',
      dayOfMonth: 1,
      startDate: targetDate - 1000,
      isActive: true,
      isDeleted: false,
      createdAt: targetDate,
      updatedAt: targetDate,
    });

    const result = await RecurringService.generateDueTransactions();
    expect(result.generatedTitles).not.toContain('Tagihan Youtube Premium');

    const txs = await db.transactions.filter((t) => t.note === 'Tagihan Youtube Premium').toArray();
    expect(txs.length).toBe(1);
    expect(txs[0].id).toBe('tx-existing-1');
  });

  it('should not recreate transactions if the existing transaction has been voided', async () => {
    const targetDate = new Date(2026, 10, 1, 9, 0, 0, 0).getTime(); // Nov 1, 2026

    // Pre-existing VOIDED transaction in DB
    await db.transactions.add({
      id: 'tx-voided-1',
      walletId: 'w-default',
      type: 'EXPENSE',
      amount: 650000,
      date: targetDate,
      note: 'Bayar Kos Bulanan',
      payee: 'Kos',
      isVoided: true,
      isDeleted: false,
      createdAt: targetDate,
      updatedAt: targetDate,
    });

    await db.recurring_transactions.add({
      id: 'rec-kos',
      walletId: 'w-default',
      type: 'EXPENSE',
      amount: 650000,
      note: 'Bayar Kos Bulanan',
      payee: 'Kos',
      tags: ['Kos'],
      frequency: 'MONTHLY',
      dayOfMonth: 1,
      startDate: targetDate - 1000,
      isActive: true,
      isDeleted: false,
      createdAt: targetDate,
      updatedAt: targetDate,
    });

    const result = await RecurringService.generateDueTransactions();
    expect(result.generatedTitles).not.toContain('Bayar Kos Bulanan');

    const txs = await db.transactions.filter((t) => t.note === 'Bayar Kos Bulanan').toArray();
    expect(txs.length).toBe(1);
    expect(txs[0].isVoided).toBe(true);
  });
});
