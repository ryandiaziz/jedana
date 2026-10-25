import { test, expect, type Page } from '@playwright/test';

test.describe.serial('Core offline flows', () => {
  let page: Page;

  test.beforeAll(async ({ browser }) => {
    page = await browser.newPage();
  });

  test.afterAll(async () => {
    await page.close();
  });

  test('1. Buat wallet', async () => {
    await page.goto('/wallets');
    const walletName = `e2e-${Date.now()}`;
    await page
      .getByPlaceholder('Wallet name (e.g., Daily Expenses, Travel Fund)')
      .fill(walletName);
    await page.getByRole('button', { name: 'Add Wallet' }).click();
    await expect(page.getByText(walletName)).toBeVisible();
  });

  test('2. Catat pengeluaran', async () => {
    await page.goto('/');

    const newTxBtn = page.getByRole('button', {
      name: /New Transaction|\+ Add first transaction/i,
    });
    await newTxBtn.first().click();

    await page.getByPlaceholder('0').fill('50000');
    await page
      .getByPlaceholder('e.g., Supermarket, Starbucks')
      .fill('Starbucks');
    await page
      .getByPlaceholder('Lunch with team, groceries, etc.')
      .fill('Lunch with team');

    await page.getByRole('button', { name: 'Save Transaction' }).click();

    const txItem = page
      .getByTestId('transaction-item')
      .filter({ hasText: 'Lunch with team' });
    await expect(txItem).toBeVisible();
    await expect(txItem.getByText('Starbucks')).toBeVisible();
    await expect(txItem.getByText(/50\.000/)).toBeVisible();
  });

  test('3. Persistensi offline', async () => {
    await page.reload();

    const txItem = page
      .getByTestId('transaction-item')
      .filter({ hasText: 'Lunch with team' });
    await expect(txItem).toBeVisible();
    await expect(txItem.getByText('Starbucks')).toBeVisible();
    await expect(txItem.getByText(/50\.000/)).toBeVisible();
  });
});
