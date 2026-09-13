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
});
