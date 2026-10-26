import { test, expect, type Page } from '@playwright/test';

/** Waits until window.scrollY stops changing (smooth scrollIntoView can outlive the click). */
async function settleScroll(page: Page, timeout = 2000): Promise<void> {
  await page.waitForFunction(
    () =>
      new Promise<boolean>((resolve) => {
        const start = window.scrollY;
        setTimeout(() => resolve(Math.abs(window.scrollY - start) < 1), 150);
      }),
    undefined,
    { timeout },
  );
}

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

  test('search action focuses the search input', async () => {
    const floatingBar = page.getByTestId('floating-actions');
    const searchBtn = floatingBar.getByRole('button', { name: 'Search transactions' });

    await page.evaluate(() => window.scrollTo({ top: 400, behavior: 'instant' }));
    await page.waitForFunction(() => Math.round(window.scrollY) === 400);

    await expect(searchBtn).toBeVisible();
    await searchBtn.click();

    const searchInput = page.getByPlaceholder('Search notes, payees, tags, or amounts...');
    await expect(searchInput).toBeFocused();
    await settleScroll(page);
  });

  test('month switch keeps scroll position', async () => {
    await page.evaluate(() => {
      (document.activeElement as HTMLElement | null)?.blur();
      document.body.style.minHeight = '200vh';
      window.scrollTo({ top: 0, behavior: 'instant' });
    });
    await page.waitForFunction(() => window.scrollY === 0);
    await settleScroll(page);

    await page.evaluate(() => {
      window.scrollTo({ top: 400, behavior: 'instant' });
    });
    await page.waitForFunction(() => Math.round(window.scrollY) === 400);

    const floatingBar = page.getByTestId('floating-actions');
    const prevPeriodBtn = floatingBar.getByRole('button', { name: 'Previous Period' });
    await expect(prevPeriodBtn).toBeVisible();

    const periodHeading = page.locator('header h2').first();
    const initialLabel = await periodHeading.textContent();
    const scrollBefore = await page.evaluate(() => window.scrollY);

    await prevPeriodBtn.click();

    await expect(periodHeading).not.toHaveText(initialLabel ?? '');
    const scrollAfter = await page.evaluate(() => window.scrollY);
    expect(Math.abs(scrollAfter - scrollBefore)).toBeLessThanOrEqual(4);
  });
});
