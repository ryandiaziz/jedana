import { TransactionService } from '../features/transactions/services/transaction.service';

export async function seedDummyData(): Promise<void> {
  const tagsExpense = ['Food', 'Transport', 'Entertainment', 'Shopping', 'Bills', 'Gas'];
  const tagsIncome = ['Salary', 'Bonus', 'Freelance', 'Investment'];

  for (let year = 2025; year <= 2026; year++) {
    const maxMonth = year === 2026 ? 6 : 11;
    for (let month = 0; month <= maxMonth; month++) {
      const numExpenses = Math.floor(Math.random() * 10) + 5;
      for (let i = 0; i < numExpenses; i++) {
        const day = Math.floor(Math.random() * 28) + 1;
        const date = new Date(year, month, day, 12, 0).getTime();
        const amount = (Math.floor(Math.random() * 150) + 10) * 1000;
        const tag = tagsExpense[Math.floor(Math.random() * tagsExpense.length)];
        await TransactionService.addTransaction({
          type: 'EXPENSE',
          amount,
          date,
          note: `[DUMMY] ${tag}`,
          tags: [tag],
        });
      }

      const numIncomes = Math.floor(Math.random() * 3) + 1;
      for (let i = 0; i < numIncomes; i++) {
        const day = Math.floor(Math.random() * 28) + 1;
        const date = new Date(year, month, day, 10, 0).getTime();
        const amount = (Math.floor(Math.random() * 500) + 100) * 10000;
        const tag = tagsIncome[Math.floor(Math.random() * tagsIncome.length)];
        await TransactionService.addTransaction({
          type: 'INCOME',
          amount,
          date,
          note: `[DUMMY] ${tag}`,
          tags: [tag],
        });
      }
    }
  }
  console.info('[Jedana Dev] Dummy data seeded successfully.');
}

if (import.meta.env.DEV && typeof window !== 'undefined') {
  interface JedanaDevWindow {
    __jedana_dev?: {
      seedDummyData: typeof seedDummyData;
    };
  }
  const win = window as unknown as JedanaDevWindow;
  win.__jedana_dev = {
    ...win.__jedana_dev,
    seedDummyData,
  };
}
