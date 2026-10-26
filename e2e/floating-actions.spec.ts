import { test, expect, type Page } from '@playwright/test';

test.describe.serial('Floating actions and back-to-top', () => {
  let page: Page;

  test.beforeAll(async ({ browser }) => {
    page = await browser.newPage();

    await page.goto('/wallets');
    const walletName = `e2e-floating-${Date.now()}`;
    await page
      .getByPlaceholder('Wallet name (e.g., Daily Expenses, Travel Fund)')
      .fill(walletName);
    await page.getByRole('button', { name: 'Add Wallet' }).click();
    await expect(page.getByText(walletName)).toBeVisible();

    await page.goto('/');
    await page
      .getByRole('button', { name: /New Transaction|\+ Add first transaction/i })
      .first()
      .click();
    await page.getByPlaceholder('0').fill('25000');
    await page.getByPlaceholder('e.g., Supermarket, Starbucks').fill('Bakery');
    await page
      .getByPlaceholder('Lunch with team, groceries, etc.')
      .fill('Morning pastry');
    await page.getByRole('button', { name: 'Save Transaction' }).click();
    await expect(page.getByRole('button', { name: 'Save Transaction' })).toBeHidden();

    for (let i = 0; i < 12; i++) {
      await page.getByRole('button', { name: 'Duplicate Transaction' }).first().click();
      await page.getByRole('button', { name: 'Save Transaction' }).click();
      await expect(page.getByRole('button', { name: 'Save Transaction' })).toBeHidden();
    }

    await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
    await page.waitForFunction(() => window.scrollY === 0);
  });

  test.afterAll(async () => {
    await page.close();
  });

  test('floating header appears after scrolling past the original header', async () => {
    const floatingBar = page.getByTestId('floating-actions');
    const floatingNewTxBtn = floatingBar.getByRole('button', { name: 'New Transaction' });

    await expect(floatingNewTxBtn).toBeHidden();

    await page.evaluate(() => window.scrollTo({ top: 400, behavior: 'instant' }));
    await page.waitForFunction(() => Math.round(window.scrollY) === 400);

    await expect(floatingNewTxBtn).toBeVisible();
    await expect(floatingBar.getByRole('button', { name: 'Previous Period' })).toBeVisible();
    await expect(floatingBar.getByRole('button', { name: 'Next Period' })).toBeVisible();

    const scrollAfterShow = await page.evaluate(() => Math.round(window.scrollY));
    expect(scrollAfterShow).toBe(400);

    await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
    await page.waitForFunction(() => window.scrollY === 0);

    await expect(floatingNewTxBtn).toBeHidden();
  });

  test('back-to-top returns to the top', async () => {
    const toTopBtn = page.getByRole('button', { name: 'Back to top' });
    await expect(toTopBtn).toBeHidden();

    await page.evaluate(() => {
      window.scrollTo({ top: window.innerHeight + 120, behavior: 'instant' });
    });
    await page.waitForFunction(() => window.scrollY >= window.innerHeight);

    await expect(toTopBtn).toBeVisible();
    await toTopBtn.click();

    await page.waitForFunction(() => window.scrollY === 0, undefined, { timeout: 2000 });
    await expect(toTopBtn).toBeHidden();
  });
});
