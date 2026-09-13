import { useLiveQuery } from 'dexie-react-hooks';
import { db, type RecurringTransaction } from '../../../db/db';
import { TransactionService } from '../../transactions/services/transaction.service';

export interface CreateRecurringInput {
  walletId: string;
  type: 'INCOME' | 'EXPENSE';
  amount: number;
  note: string;
  payee?: string;
  tags: string[];
  frequency: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY';
  dayOfMonth?: number;
  dayOfWeek?: number;
  startDate: number;
  endDate?: number;
}

export const RecurringService = {
  /**
   * Adds a new recurring transaction rule.
   */
  async addRecurring(input: CreateRecurringInput): Promise<string> {
    const now = Date.now();
    const id = crypto.randomUUID();

    await db.recurring_transactions.add({
      id,
      walletId: input.walletId,
      type: input.type,
      amount: input.amount,
      note: input.note,
      payee: input.payee?.trim() || undefined,
      tags: input.tags || [],
      frequency: input.frequency,
      dayOfMonth: input.dayOfMonth,
      dayOfWeek: input.dayOfWeek,
      startDate: input.startDate,
      endDate: input.endDate,
      lastGeneratedDate: undefined,
      isActive: true,
      isDeleted: false,
      createdAt: now,
      updatedAt: now,
    });

    // Run generator immediately to check if first instance is due
    await this.generateDueTransactions();

    return id;
  },

  /**
   * Updates an existing recurring transaction rule.
   */
  async updateRecurring(
    id: string,
    input: Partial<CreateRecurringInput> & { isActive?: boolean }
  ): Promise<void> {
    const now = Date.now();
    await db.recurring_transactions.update(id, {
      ...input,
      updatedAt: now,
    });
  },

  /**
   * Toggles the active status of a recurring rule.
   */
  async toggleActive(id: string, isActive: boolean): Promise<void> {
    await db.recurring_transactions.update(id, {
      isActive,
      updatedAt: Date.now(),
    });
  },

  /**
   * Soft-deletes a recurring rule.
   */
  async deleteRecurring(id: string): Promise<void> {
    await db.recurring_transactions.update(id, {
      isDeleted: true,
      updatedAt: Date.now(),
    });
  },

  /**
   * Live query for all active (non-deleted) recurring rules.
   */
  useRecurringTransactions(): RecurringTransaction[] | undefined {
    return useLiveQuery(() => {
      return db.recurring_transactions.filter((r) => !r.isDeleted).toArray();
    }, []);
  },

  /**
   * Generator Engine:
   * Scans all active recurring rules, computes due dates up to `Date.now()`,
   * creates actual transactions via TransactionService, and updates lastGeneratedDate.
   */
  async generateDueTransactions(): Promise<{ generatedCount: number; generatedTitles: string[] }> {
    const now = Date.now();
    const rules = await db.recurring_transactions
      .filter((r) => !r.isDeleted && r.isActive)
      .toArray();

    let generatedCount = 0;
    const generatedTitles: string[] = [];

    for (const rule of rules) {
      const dueTimestamps: number[] = [];

      // Determine beginning of evaluation range
      const anchorTime = rule.lastGeneratedDate ?? (rule.startDate - 1);

      if (rule.frequency === 'DAILY') {
        const oneDay = 24 * 60 * 60 * 1000;
        let nextTime = rule.lastGeneratedDate ? rule.lastGeneratedDate + oneDay : rule.startDate;
        while (nextTime <= now) {
          if (!rule.endDate || nextTime <= rule.endDate) {
            dueTimestamps.push(nextTime);
          }
          nextTime += oneDay;
        }
      } else if (rule.frequency === 'WEEKLY') {
        const targetDayOfWeek = rule.dayOfWeek ?? 1; // Default Monday
        const checkDate = new Date(anchorTime);
        checkDate.setDate(checkDate.getDate() + 1);
        checkDate.setHours(9, 0, 0, 0);

        while (checkDate.getTime() <= now) {
          if (checkDate.getDay() === targetDayOfWeek) {
            const ts = checkDate.getTime();
            if (ts >= rule.startDate && (!rule.endDate || ts <= rule.endDate)) {
              dueTimestamps.push(ts);
            }
          }
          checkDate.setDate(checkDate.getDate() + 1);
        }
      } else if (rule.frequency === 'MONTHLY') {
        const targetDay = rule.dayOfMonth ?? 1;
        const startDateObj = new Date(rule.startDate);
        const lastGenObj = rule.lastGeneratedDate ? new Date(rule.lastGeneratedDate) : null;

        // Start checking from the month of the last generated date (or startDate)
        const curCheck = lastGenObj
          ? new Date(lastGenObj.getFullYear(), lastGenObj.getMonth() + 1, 1)
          : new Date(startDateObj.getFullYear(), startDateObj.getMonth(), 1);

        while (curCheck.getTime() <= now) {
          const y = curCheck.getFullYear();
          const m = curCheck.getMonth();
          // Clamp day of month to maximum days in target month
          const maxDays = new Date(y, m + 1, 0).getDate();
          const actualDay = Math.min(targetDay, maxDays);
          const targetDate = new Date(y, m, actualDay, 9, 0, 0, 0);
          const ts = targetDate.getTime();

          if (ts > anchorTime && ts <= now) {
            if (ts >= rule.startDate && (!rule.endDate || ts <= rule.endDate)) {
              dueTimestamps.push(ts);
            }
          }

          curCheck.setMonth(curCheck.getMonth() + 1);
        }
      } else if (rule.frequency === 'YEARLY') {
        const targetDateObj = new Date(rule.startDate);
        let checkYear = lastGenObjYear(rule.lastGeneratedDate) + 1;
        if (!rule.lastGeneratedDate) {
          checkYear = targetDateObj.getFullYear();
        }

        while (true) {
          const targetDate = new Date(
            checkYear,
            targetDateObj.getMonth(),
            targetDateObj.getDate(),
            9,
            0,
            0,
            0
          );
          const ts = targetDate.getTime();
          if (ts > now) break;

          if (ts > anchorTime && ts >= rule.startDate && (!rule.endDate || ts <= rule.endDate)) {
            dueTimestamps.push(ts);
          }
          checkYear++;
        }
      }

      // Generate all due transactions
      if (dueTimestamps.length > 0) {
        dueTimestamps.sort((a, b) => a - b);

        for (const ts of dueTimestamps) {
          await TransactionService.addTransaction({
            walletId: rule.walletId,
            type: rule.type,
            amount: rule.amount,
            date: ts,
            note: rule.note,
            payee: rule.payee,
            tags: rule.tags || [],
          });
          generatedCount++;
          generatedTitles.push(rule.note);
        }

        const latestTimestamp = dueTimestamps[dueTimestamps.length - 1];
        await db.recurring_transactions.update(rule.id!, {
          lastGeneratedDate: latestTimestamp,
          updatedAt: Date.now(),
        });
      }
    }

    return { generatedCount, generatedTitles };
  },
};

function lastGenObjYear(lastGenDate?: number): number {
  if (!lastGenDate) return 1970;
  return new Date(lastGenDate).getFullYear();
}
