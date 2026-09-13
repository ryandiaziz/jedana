import { describe, it, expect, beforeEach } from 'vitest';
import 'fake-indexeddb/auto';
import { db } from '../db/db';
import { seedDummyData } from './devTools';

describe('devTools.seedDummyData', () => {
  beforeEach(async () => {
    await db.transactions.clear();
    await db.tags.clear();
    await db.transaction_tags.clear();
  });

  it('seeds dummy transactions for 2025 and 2026', async () => {
    await seedDummyData();
    const count = await db.transactions.count();
    expect(count).toBeGreaterThan(50);

    const dummyTxs = await db.transactions.filter(t => t.note.startsWith('[DUMMY]')).toArray();
    expect(dummyTxs.length).toBe(count);
  });
});
