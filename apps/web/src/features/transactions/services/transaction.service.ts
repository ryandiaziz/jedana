import { useLiveQuery } from 'dexie-react-hooks';
import { db, type Transaction, type Tag, type TransactionTag } from '../../../db/db';

export type TransactionWithTags = Transaction & { tags: Tag[] };

export interface TransactionInput {
  walletId?: string;
  type: 'INCOME' | 'EXPENSE';
  amount: number;
  date: number;
  note: string;
  payee?: string;
  tags: string[];
}

/**
 * Reconciles and synchronizes tags associated with a specific transaction.
 * Deduplicates tag names case-insensitively, creates missing tags, and updates
 * junction table records atomically.
 */
async function reconcileTags(txId: string, rawTagNames: string[], timestamp: number): Promise<void> {
  // 1. Normalize and deduplicate tag names case-insensitively
  const seen = new Set<string>();
  const normalizedNames: string[] = [];
  for (const raw of rawTagNames) {
    const trimmed = raw.trim();
    if (!trimmed) continue;
    const lower = trimmed.toLowerCase();
    if (!seen.has(lower)) {
      seen.add(lower);
      normalizedNames.push(trimmed);
    }
  }

  // 2. Resolve or create Tag records
  const targetTags: Tag[] = [];
  for (const name of normalizedNames) {
    let tag = await db.tags.where('name').equalsIgnoreCase(name).first();
    if (!tag) {
      const tagId = crypto.randomUUID();
      tag = {
        id: tagId,
        name,
        isArchived: false,
        isDeleted: false,
        createdAt: timestamp,
        updatedAt: timestamp,
      };
      await db.tags.add(tag);
    } else if (tag.isDeleted) {
      // Re-activate previously soft-deleted tag
      await db.tags.update(tag.id!, { isDeleted: false, updatedAt: timestamp });
      tag.isDeleted = false;
      tag.updatedAt = timestamp;
    }
    targetTags.push(tag);
  }

  const targetTagIdSet = new Set(targetTags.map((t) => t.id!));

  // 3. Fetch existing links for this transaction
  const existingLinks: TransactionTag[] = await db.transaction_tags
    .where('transactionId')
    .equals(txId)
    .toArray();

  const existingLinkMap = new Map<string, TransactionTag>();
  for (const link of existingLinks) {
    existingLinkMap.set(link.tagId, link);
  }

  // 4. Soft-delete links that are no longer present
  for (const link of existingLinks) {
    if (!targetTagIdSet.has(link.tagId) && !link.isDeleted) {
      await db.transaction_tags.update(link.id!, {
        isDeleted: true,
        updatedAt: timestamp,
      });
    }
  }

  // 5. Insert new links or restore soft-deleted ones
  for (const tag of targetTags) {
    const existing = existingLinkMap.get(tag.id!);
    if (!existing) {
      await db.transaction_tags.add({
        id: crypto.randomUUID(),
        transactionId: txId,
        tagId: tag.id!,
        createdAt: timestamp,
        updatedAt: timestamp,
        isDeleted: false,
      });
    } else if (existing.isDeleted) {
      await db.transaction_tags.update(existing.id!, {
        isDeleted: false,
        updatedAt: timestamp,
      });
    }
  }
}

/**
 * Resolves an active target wallet ID or lazily initializes the default wallet.
 */
async function ensureTargetWalletId(walletId: string | undefined, timestamp: number): Promise<string> {
  if (walletId) {
    const existing = await db.wallets.get(walletId);
    if (existing && !existing.isDeleted) {
      return walletId;
    }
  }

  const activeWallet = await db.wallets.filter((w) => !w.isDeleted).first();
  if (activeWallet?.id) {
    return activeWallet.id;
  }

  const newWalletId = crypto.randomUUID();
  await db.wallets.add({
    id: newWalletId,
    name: 'Main Wallet',
    isDeleted: false,
    createdAt: timestamp,
    updatedAt: timestamp,
  });
  return newWalletId;
}

/**
 * TransactionService (TransactionLedger) is a Deep Module.
 * Behind a small, intuitive interface, it encapsulates relational schema joins,
 * atomic Dexie write transactions, case-insensitive tag reconciliation, and
 * O(N) batch query resolution without N+1 query loops.
 */
export const TransactionService = {
  /**
   * Adds a new transaction. Atomically guarantees wallet association
   * and synchronizes all tags within a single database transaction.
   */
  async addTransaction(data: TransactionInput): Promise<string> {
    return await db.transaction('rw', [db.wallets, db.transactions, db.tags, db.transaction_tags], async () => {
      const now = Date.now();
      const targetWalletId = await ensureTargetWalletId(data.walletId, now);
      const txId = crypto.randomUUID();

      await db.transactions.add({
        id: txId,
        walletId: targetWalletId,
        type: data.type,
        amount: data.amount,
        date: data.date,
        note: data.note,
        payee: data.payee?.trim() || undefined,
        isVoided: false,
        isDeleted: false,
        createdAt: now,
        updatedAt: now,
      });

      await reconcileTags(txId, data.tags, now);
      return txId;
    });
  },

  /**
   * Updates an existing transaction and synchronizes tags atomically.
   */
  async updateTransaction(id: string, data: TransactionInput): Promise<void> {
    await db.transaction('rw', [db.wallets, db.transactions, db.tags, db.transaction_tags], async () => {
      const now = Date.now();
      const targetWalletId = await ensureTargetWalletId(data.walletId, now);

      await db.transactions.update(id, {
        walletId: targetWalletId,
        type: data.type,
        amount: data.amount,
        date: data.date,
        note: data.note,
        payee: data.payee?.trim() || undefined,
        updatedAt: now,
      });

      await reconcileTags(id, data.tags, now);
    });
  },

  /**
   * Fetches a single transaction with resolved tags.
   */
  async getTransaction(id: string): Promise<TransactionWithTags | undefined> {
    const tx = await db.transactions.get(id);
    if (!tx || tx.isDeleted) return undefined;

    const links = await db.transaction_tags
      .where('transactionId')
      .equals(id)
      .filter((l) => !l.isDeleted)
      .toArray();

    if (links.length === 0) {
      return { ...tx, tags: [] };
    }

    const tagIds = links.map((l) => l.tagId);
    const tags = await db.tags
      .where('id')
      .anyOf(tagIds)
      .filter((t) => !t.isDeleted)
      .toArray();

    return { ...tx, tags };
  },

  /**
   * Voids a transaction (soft cancellation).
   */
  async voidTransaction(id: string): Promise<void> {
    await db.transactions.update(id, { isVoided: true, updatedAt: Date.now() });
  },

  /**
   * Restores a voided transaction back to active history.
   */
  async restoreTransaction(id: string): Promise<void> {
    await db.transactions.update(id, { isVoided: false, updatedAt: Date.now() });
  },

  /**
   * Hook to fetch transactions with associated tags.
   * Uses a 3-query indexed batch join instead of an N+1 query loop:
   * 1. Query matching transactions
   * 2. Batch-query active links via anyOf(txIds)
   * 3. Batch-query active tags via anyOf(tagIds)
   * Assembles the result in-memory in O(N) time.
   */
  useRecentTransactions(startDate?: number, endDate?: number): TransactionWithTags[] | undefined {
    return useLiveQuery(async () => {
      let collection = db.transactions.orderBy('date').reverse();
      if (startDate !== undefined && endDate !== undefined) {
        collection = db.transactions.where('date').between(startDate, endDate, true, true).reverse();
      }
      const txs = await collection.filter((t) => !t.isDeleted).toArray();
      if (txs.length === 0) return [];

      const txIds = txs.map((t) => t.id!).filter(Boolean);

      // Batch query 2: Get all active links for these transactions
      const links = await db.transaction_tags
        .where('transactionId')
        .anyOf(txIds)
        .filter((l) => !l.isDeleted)
        .toArray();

      if (links.length === 0) {
        return txs.map((tx) => ({ ...tx, tags: [] }));
      }

      // Batch query 3: Get all active tags
      const uniqueTagIds = Array.from(new Set(links.map((l) => l.tagId)));
      const tags = await db.tags
        .where('id')
        .anyOf(uniqueTagIds)
        .filter((t) => !t.isDeleted)
        .toArray();

      const tagMap = new Map<string, Tag>();
      tags.forEach((t) => {
        if (t.id) tagMap.set(t.id, t);
      });

      const txTagsMap = new Map<string, Tag[]>();
      links.forEach((link) => {
        const tag = tagMap.get(link.tagId);
        if (tag) {
          const current = txTagsMap.get(link.transactionId) || [];
          current.push(tag);
          txTagsMap.set(link.transactionId, current);
        }
      });

      return txs.map((tx) => ({
        ...tx,
        tags: txTagsMap.get(tx.id!) || [],
      }));
    }, [startDate, endDate]);
  },

  /**
   * Hook to compute the total income, expense, and net balance.
   */
  useSummary(startDate?: number, endDate?: number) {
    return useLiveQuery(
      async () => {
        let collection = db.transactions.toCollection();
        if (startDate !== undefined && endDate !== undefined) {
          collection = db.transactions.where('date').between(startDate, endDate, true, true);
        }
        const txs = await collection.toArray();
        const validTxs = txs.filter((t) => !t.isVoided && !t.isDeleted);
        const income = validTxs.filter((t) => t.type === 'INCOME').reduce((sum, t) => sum + t.amount, 0);
        const expense = validTxs.filter((t) => t.type === 'EXPENSE').reduce((sum, t) => sum + t.amount, 0);
        return { income, expense, net: income - expense };
      },
      [startDate, endDate],
      { income: 0, expense: 0, net: 0 }
    );
  },

  /**
   * Hook to fetch all unique payees for auto-complete.
   */
  usePayees(): string[] {
    return (
      useLiveQuery(async () => {
        const txs = await db.transactions.filter((t) => !t.isDeleted).toArray();
        const payees = new Set<string>();
        txs.forEach((t) => {
          if (t.payee) payees.add(t.payee);
        });
        return Array.from(payees).sort();
      }, []) || []
    );
  },

  /**
   * Hook to fetch the most frequently used notes for a specific payee.
   */
  useFrequentNotes(payee?: string): string[] {
    return (
      useLiveQuery(async () => {
        if (!payee) return [];
        const txs = await db.transactions.where('payee').equals(payee).filter((t) => !t.isDeleted).toArray();
        const noteCount: Record<string, number> = {};
        txs.forEach((t) => {
          if (t.note) {
            noteCount[t.note] = (noteCount[t.note] || 0) + 1;
          }
        });
        return Object.entries(noteCount)
          .sort((a, b) => b[1] - a[1])
          .map((entry) => entry[0]);
      }, [payee]) || []
    );
  },
};
export default TransactionService;
