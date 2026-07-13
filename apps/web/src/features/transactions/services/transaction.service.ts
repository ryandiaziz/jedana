import { useLiveQuery } from 'dexie-react-hooks';
import { db, type Transaction, type Tag } from '../../../db/db';

export type TransactionWithTags = Transaction & { tags: Tag[] };

/**
 * TransactionService is a Deep Module that provides a clean seam for the UI.
 * It hides all database complexity (wallets, relational tags, indexedDB queries).
 */
export const TransactionService = {
  /**
   * Adds a new transaction. Automatically ensures a default wallet exists
   * and handles the creation and association of tags.
   */
  async addTransaction(data: { walletId?: string, type: 'INCOME' | 'EXPENSE', amount: number, date: number, note: string, payee?: string, tags: string[] }): Promise<void> {
    const now = Date.now();
    let targetWalletId = data.walletId;

    if (!targetWalletId) {
      const wallet = await db.wallets.limit(1).first();
      if (!wallet) {
        const newWalletId = crypto.randomUUID();
        await db.wallets.add({
          id: newWalletId,
          name: "Dompet Utama",
          createdAt: now,
          updatedAt: now
        });
        targetWalletId = newWalletId;
      } else {
        targetWalletId = wallet.id!;
      }
    }

    const txId = crypto.randomUUID();
    await db.transactions.add({
      id: txId,
      walletId: targetWalletId,
      type: data.type,
      amount: data.amount,
      date: data.date,
      note: data.note,
      payee: data.payee,
      createdAt: now,
      updatedAt: now
    });

    for (const tagName of data.tags) {
      if (!tagName) continue;
      let tag = await db.tags.where('name').equalsIgnoreCase(tagName).first();
      if (!tag) {
        const tagId = crypto.randomUUID();
        await db.tags.add({ id: tagId, name: tagName, isArchived: false, createdAt: now, updatedAt: now });
        tag = { id: tagId, name: tagName, isArchived: false, createdAt: now, updatedAt: now };
      }
      await db.transaction_tags.add({
        id: crypto.randomUUID(),
        transactionId: txId,
        tagId: tag.id!,
        createdAt: now,
        updatedAt: now
      });
    }
  },

  async updateTransaction(id: string, data: { walletId?: string, type: 'INCOME' | 'EXPENSE', amount: number, date: number, note: string, payee?: string, tags: string[] }): Promise<void> {
    const now = Date.now();
    let targetWalletId = data.walletId;
    
    if (!targetWalletId) {
      const wallet = await db.wallets.limit(1).first();
      if (wallet) targetWalletId = wallet.id!;
    }

    await db.transactions.update(id, {
      walletId: targetWalletId,
      type: data.type,
      amount: data.amount,
      date: data.date,
      note: data.note,
      payee: data.payee,
      updatedAt: now
    });

    // Remove old tags
    const oldTags = await db.transaction_tags.where('transactionId').equals(id).toArray();
    for (const oldTag of oldTags) {
       await db.transaction_tags.update(oldTag.id!, { isDeleted: true, updatedAt: now });
    }

    // Insert new tags
    for (const tagName of data.tags) {
      if (!tagName) continue;
      let tag = await db.tags.where('name').equalsIgnoreCase(tagName).first();
      if (!tag) {
        const tagId = crypto.randomUUID();
        await db.tags.add({ id: tagId, name: tagName, isArchived: false, createdAt: now, updatedAt: now });
        tag = { id: tagId, name: tagName, isArchived: false, createdAt: now, updatedAt: now };
      }
      await db.transaction_tags.add({
        id: crypto.randomUUID(),
        transactionId: id,
        tagId: tag.id!,
        createdAt: now,
        updatedAt: now
      });
    }
  },

  /**
   * Voids a transaction (soft-delete).
   */
  async voidTransaction(id: string): Promise<void> {
    await db.transactions.update(id, { isVoided: true, updatedAt: Date.now() });
  },

  /**
   * Restores a voided transaction.
   */
  async restoreTransaction(id: string): Promise<void> {
    await db.transactions.update(id, { isVoided: false, updatedAt: Date.now() });
  },

  /**
   * Hook to fetch all transactions with their associated tags.
   */
  useRecentTransactions(startDate?: number, endDate?: number): TransactionWithTags[] | undefined {
    return useLiveQuery(async () => {
      let collection = db.transactions.orderBy('date').reverse();
      if (startDate !== undefined && endDate !== undefined) {
        // Use between to filter dates inclusive of start and end
        collection = db.transactions.where('date').between(startDate, endDate, true, true).reverse();
      }
      const txs = await collection.toArray();
      
      return Promise.all(txs.map(async tx => {
        const tagLinks = await db.transaction_tags.where('transactionId').equals(tx.id!).toArray();
        const validLinks = tagLinks.filter(link => !link.isDeleted);
        const tags = await Promise.all(validLinks.map(link => db.tags.get(link.tagId)));
        return { ...tx, tags: tags.filter(t => t && !t.isDeleted) as Tag[] };
      }));
    }, [startDate, endDate]);
  },

  /**
   * Hook to compute the total income, expense, and net balance.
   */
  useSummary(startDate?: number, endDate?: number) {
    return useLiveQuery(async () => {
      let collection = db.transactions.toCollection();
      if (startDate !== undefined && endDate !== undefined) {
        collection = db.transactions.where('date').between(startDate, endDate, true, true);
      }
      const txs = await collection.toArray();
      const validTxs = txs.filter(t => !t.isVoided);
      const income = validTxs.filter(t => t.type === 'INCOME').reduce((sum, t) => sum + t.amount, 0);
      const expense = validTxs.filter(t => t.type === 'EXPENSE').reduce((sum, t) => sum + t.amount, 0);
      return { income, expense, net: income - expense };
    }, [startDate, endDate], { income: 0, expense: 0, net: 0 }); // Default values during loading
  },

  /**
   * Hook to fetch all unique payees for auto-complete.
   */
  usePayees(): string[] {
    return useLiveQuery(async () => {
      const txs = await db.transactions.toArray();
      const payees = new Set<string>();
      txs.forEach(t => {
        if (t.payee) payees.add(t.payee);
      });
      return Array.from(payees).sort();
    }, []) || [];
  },

  /**
   * Hook to fetch the most frequently used notes for a specific payee.
   */
  useFrequentNotes(payee?: string): string[] {
    return useLiveQuery(async () => {
      if (!payee) return [];
      const txs = await db.transactions.where('payee').equals(payee).toArray();
      const noteCount: Record<string, number> = {};
      txs.forEach(t => {
        if (t.note) {
          noteCount[t.note] = (noteCount[t.note] || 0) + 1;
        }
      });
      return Object.entries(noteCount)
        .sort((a, b) => b[1] - a[1]) // sort by descending frequency
        .map(entry => entry[0]); // return all notes
    }, [payee]) || [];
  }
};
