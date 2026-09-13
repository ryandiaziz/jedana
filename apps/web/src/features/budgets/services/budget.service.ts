import { useLiveQuery } from 'dexie-react-hooks';
import { db, type Budget, type Tag } from '../../../db/db';

export interface TagBudgetProgress {
  budgetId: string;
  tagId: string;
  tagName: string;
  monthlyLimit: number;
  spent: number;
  remaining: number;
  percentage: number;
  status: 'normal' | 'warning' | 'danger';
}

export interface BudgetSummary {
  items: TagBudgetProgress[];
  totalLimit: number;
  totalSpent: number;
  totalRemaining: number;
  overallPercentage: number;
  overBudgetCount: number;
  nearLimitCount: number;
}

export const BudgetService = {
  /**
   * Upsert a monthly budget for a specific tag.
   */
  async setBudget(tagId: string, monthlyLimit: number): Promise<string> {
    const now = Date.now();
    const existing = await db.budgets.where('tagId').equals(tagId).first();

    if (existing) {
      await db.budgets.update(existing.id!, {
        monthlyLimit,
        isDeleted: false,
        updatedAt: now,
      });
      return existing.id!;
    } else {
      const id = crypto.randomUUID();
      await db.budgets.add({
        id,
        tagId,
        monthlyLimit,
        isDeleted: false,
        createdAt: now,
        updatedAt: now,
      });
      return id;
    }
  },

  /**
   * Soft-delete a budget.
   */
  async deleteBudget(id: string): Promise<void> {
    await db.budgets.update(id, {
      isDeleted: true,
      updatedAt: Date.now(),
    });
  },

  /**
   * Live query of all active budgets.
   */
  useBudgets(): Budget[] | undefined {
    return useLiveQuery(() => {
      return db.budgets.filter((b) => !b.isDeleted).toArray();
    }, []);
  },

  /**
   * Live query computing spent vs monthlyLimit per budgeted tag within a date range.
   */
  useBudgetProgress(startDate?: number, endDate?: number): BudgetSummary {
    const defaultResult: BudgetSummary = {
      items: [],
      totalLimit: 0,
      totalSpent: 0,
      totalRemaining: 0,
      overallPercentage: 0,
      overBudgetCount: 0,
      nearLimitCount: 0,
    };

    const summary = useLiveQuery(async () => {
      // 1. Fetch active budgets
      const budgets = await db.budgets.filter((b) => !b.isDeleted).toArray();
      if (budgets.length === 0) return defaultResult;

      // 2. Fetch tags map
      const allTags = await db.tags.toArray();
      const tagMap = new Map<string, Tag>();
      allTags.forEach((t) => tagMap.set(t.id!, t));

      // 3. Fetch expense transactions in period
      let txQuery = db.transactions.toCollection();
      if (startDate !== undefined && endDate !== undefined) {
        txQuery = db.transactions.where('date').between(startDate, endDate, true, true);
      }
      const rawTxs = await txQuery.toArray();
      const validExpenses = rawTxs.filter((t) => !t.isVoided && t.type === 'EXPENSE');

      // 4. Map transactions to tags
      const txIds = validExpenses.map((t) => t.id!).filter(Boolean);
      const links = await db.transaction_tags.filter((tt) => !tt.isDeleted && txIds.includes(tt.transactionId)).toArray();

      // Group links by transaction
      const linksByTx: Record<string, string[]> = {};
      links.forEach((l) => {
        if (!linksByTx[l.transactionId]) linksByTx[l.transactionId] = [];
        linksByTx[l.transactionId].push(l.tagId);
      });

      // Calculate spent amount per tag
      const tagSpent: Record<string, number> = {};
      validExpenses.forEach((tx) => {
        const tTags = linksByTx[tx.id!] || [];
        if (tTags.length > 0) {
          // If transaction has multiple tags, split amount equally among tags
          const split = tx.amount / tTags.length;
          tTags.forEach((tagId) => {
            tagSpent[tagId] = (tagSpent[tagId] || 0) + split;
          });
        }
      });

      // 5. Build progress for each budgeted tag
      let totalLimit = 0;
      let totalSpent = 0;
      let overBudgetCount = 0;
      let nearLimitCount = 0;

      const items: TagBudgetProgress[] = budgets.map((b) => {
        const tag = tagMap.get(b.tagId);
        const tagName = tag ? tag.name : 'Unknown Tag';
        const spent = tagSpent[b.tagId] || 0;
        const remaining = b.monthlyLimit - spent;
        const percentage = b.monthlyLimit > 0 ? (spent / b.monthlyLimit) * 100 : 0;

        totalLimit += b.monthlyLimit;
        totalSpent += spent;

        let status: 'normal' | 'warning' | 'danger' = 'normal';
        if (percentage >= 100) {
          status = 'danger';
          overBudgetCount++;
        } else if (percentage >= 80) {
          status = 'warning';
          nearLimitCount++;
        }

        return {
          budgetId: b.id!,
          tagId: b.tagId,
          tagName,
          monthlyLimit: b.monthlyLimit,
          spent,
          remaining,
          percentage,
          status,
        };
      });

      // Sort items: danger first, then warning, then highest percentage
      items.sort((a, b) => b.percentage - a.percentage);

      const overallPercentage = totalLimit > 0 ? (totalSpent / totalLimit) * 100 : 0;

      return {
        items,
        totalLimit,
        totalSpent,
        totalRemaining: totalLimit - totalSpent,
        overallPercentage,
        overBudgetCount,
        nearLimitCount,
      };
    }, [startDate, endDate]);

    return summary || defaultResult;
  },
};
