import { test, expect } from '@playwright/test';
import { ProductListPage } from '../pages/ProductListPage';
import { TEST_DATA } from '../fixtures/testData';

test.describe('Artemest Sort Functionality', () => {
  let plp: ProductListPage;

  test.beforeEach(async ({ page }) => {
    plp = new ProductListPage(page);
    await page.goto(TEST_DATA.tablesUrl);
    await page.waitForLoadState('networkidle');
  });

  test('Step 5 - Default sort is Sort by Recommended', async ({ page }) => {
    const sortLabel = await plp.getCurrentSortLabel();
    expect(sortLabel.toLowerCase()).toContain('recommended');
    expect(page.url()).not.toMatch(/[?&]s=/);
  });

  test('Step 6 - Product count is displayed on default sort', async () => {
    const countText = await plp.getResultsCountText();
    expect(countText).toMatch(/\d+/);
  });

  test('Step 7 - Sort by Price High to Low orders products correctly', async ({ page }) => {
    await plp.selectSortOption(TEST_DATA.sortOptions.priceHighToLow);
    const sortLabel = await plp.getCurrentSortLabel();
    expect(sortLabel.toLowerCase()).toContain('high');
    expect(page.url()).toMatch(/price.*desc|_desc/i);
    const prices = await plp.getFirstNProductPrices(6);
    expect(prices.length).toBeGreaterThanOrEqual(3);
    for (let i = 0; i < prices.length - 1; i++) {
      expect(prices[i]).toBeGreaterThanOrEqual(prices[i + 1]);
    }
  });

  test('Step 8 - Sort by Fast Shipping surfaces Ready to Ship products first', async ({ page }) => {
    await plp.selectSortOption(TEST_DATA.sortOptions.fastShipping);
    const sortLabel = await plp.getCurrentSortLabel();
    expect(sortLabel.toLowerCase()).toContain('fast');
    expect(page.url()).toMatch(/fast_shipping/i);
    const shippingLabels = await plp.getFirstRowProductLabels();
    const hasReadyToShip = shippingLabels.some((l) =>
      l.toLowerCase().includes('ready to ship')
    );
    expect(hasReadyToShip).toBe(true);
    const countText = await plp.getResultsCountText();
    expect(countText).toMatch(/\d+/);
  });

  test('Sort dropdown contains all expected options', async ({ page }) => {
    const sortCombo = page.getByRole('combobox', { name: /sort by/i });
    await expect(sortCombo).toBeVisible();
    const options: string[] = await sortCombo.evaluate(
      (el: HTMLSelectElement) =>
        Array.from(el.options).map((o) => o.text.toLowerCase())
    );
    expect(options.some((o) => o.includes('recommended'))).toBe(true);
    expect(options.some((o) => o.includes('fast shipping'))).toBe(true);
    expect(options.some((o) => o.includes('high to low'))).toBe(true);
    expect(options.some((o) => o.includes('low to high'))).toBe(true);
    expect(options.some((o) => o.includes('new arrivals'))).toBe(true);
  });
});
