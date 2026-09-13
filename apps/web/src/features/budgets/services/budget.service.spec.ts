import { describe, it, expect, beforeEach } from 'vitest';
import 'fake-indexeddb/auto';
import { db } from '../../../db/db';
import { BudgetService } from './budget.service';

describe('BudgetService', () => {
  beforeEach(async () => {
    await Promise.all(db.tables.map((table) => table.clear()));
  });

  it('should set, update and delete a budget', async () => {
    // 1. Add budget
    const budgetId = await BudgetService.setBudget('tag-food', 1500000);
    expect(budgetId).toBeDefined();

    const stored = await db.budgets.get(budgetId);
    expect(stored).toBeDefined();
    expect(stored?.monthlyLimit).toBe(1500000);
    expect(stored?.tagId).toBe('tag-food');
    expect(stored?.isDeleted).toBe(false);

    // 2. Update existing budget for the same tag
    const updatedId = await BudgetService.setBudget('tag-food', 2000000);
    expect(updatedId).toBe(budgetId);

    const updatedStored = await db.budgets.get(budgetId);
    expect(updatedStored?.monthlyLimit).toBe(2000000);

    // 3. Delete budget (soft delete)
    await BudgetService.deleteBudget(budgetId);
    const deletedStored = await db.budgets.get(budgetId);
    expect(deletedStored?.isDeleted).toBe(true);
  });
});
