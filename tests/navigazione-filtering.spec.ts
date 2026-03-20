import { test, expect } from '@playwright/test';
import { ProductListPage } from '../pages/ProductListPage';
import { TEST_DATA } from '../fixtures/testData';

const FAST_SHIPPING_URL =
  TEST_DATA.tablesUrl + '?s=v2-products_fast_shipping';

const ALL_FILTERS_URL =
  TEST_DATA.tablesUrl +
  '?s=v2-products_fast_shipping' +
  '&a%5B0%5D=Bronzetto' +
  '&m%5B0%5D=Brass&m%5B1%5D=Steel' +
  '&pu=2000%3A6000';

test.describe('Artemest Filter Functionality', () => {
  let plp: ProductListPage;

  test.beforeEach(async ({ page }) => {
    plp = new ProductListPage(page);
    await page.goto(FAST_SHIPPING_URL);
    await page.waitForLoadState('networkidle');
  });

  test('Step 9 - Material filter selects Brass and Steel', async ({ page }) => {
    await plp.openMaterialFilter();
    await expect(
      page.getByRole('checkbox', { name: /brass/i })
    ).toBeVisible();
    await plp.selectMaterial(TEST_DATA.materials.steel);
    await expect(
      page.getByRole('checkbox', { name: /steel/i })
    ).toBeChecked();
    expect(await plp.activeTagExists('steel')).toBe(true);
    await plp.openMaterialFilter();
    await plp.selectMaterial(TEST_DATA.materials.brass);
    await expect(
      page.getByRole('checkbox', { name: /brass/i })
    ).toBeChecked();
    expect(await plp.activeTagExists('brass')).toBe(true);
    expect(await plp.activeTagExists('steel')).toBe(true);
    const materialCount = await plp.getMaterialFilterCount();
    expect(materialCount).toBe(2);
    const countText = await plp.getResultsCountText();
    expect(countText).toMatch(/\d+/);
  });

  test('Step 10 - Other Filters: Artisan filter selects Bronzetto', async ({ page }) => {
    await plp.openMaterialFilter();
    await plp.selectMaterial(TEST_DATA.materials.brass);
    await plp.openMaterialFilter();
    await plp.selectMaterial(TEST_DATA.materials.steel);
    await plp.openOtherFilters();
    await expect(
      page.getByRole('button', { name: /artisan/i })
    ).toBeVisible();
    await plp.openArtisanFilter();
    await expect(
      page.getByRole('checkbox', { name: /bronzetto/i })
    ).toBeVisible();
    await plp.selectArtisan(TEST_DATA.artisans.bronzetto);
    await expect(
      page.getByRole('checkbox', { name: /bronzetto/i })
    ).toBeChecked();
    expect(await plp.activeTagExists('bronzetto')).toBe(true);
    const artisanCount = await plp.getArtisanFilterCount();
    expect(artisanCount).toBe(1);
  });

  test('Step 11 - Price filter sets range 2000 to 6000 and applies', async ({ page }) => {
    await plp.openMaterialFilter();
    await plp.selectMaterial(TEST_DATA.materials.brass);
    await plp.openMaterialFilter();
    await plp.selectMaterial(TEST_DATA.materials.steel);
    await plp.openOtherFilters();
    await plp.openArtisanFilter();
    await plp.selectArtisan(TEST_DATA.artisans.bronzetto);
    await plp.openPriceFilter();
    await plp.setPriceRange(TEST_DATA.priceRange.min, TEST_DATA.priceRange.max);
    await plp.submitPriceFilter();
    expect(await plp.activeTagExists('2000')).toBe(true);
    expect(await plp.activeTagExists('6000')).toBe(true);
    expect(page.url()).toMatch(/pu=2000.*6000|price/i);
  });

  test('Step 12 - All products match active filters and price range', async ({ page }) => {
    await page.goto(ALL_FILTERS_URL);
    await page.waitForLoadState('networkidle');
    expect(await plp.activeTagExists('Brass')).toBe(true);
    expect(await plp.activeTagExists('Steel')).toBe(true);
    expect(await plp.activeTagExists('Bronzetto')).toBe(true);
    expect(await plp.activeTagExists('2000')).toBe(true);
    expect(await plp.activeTagExists('6000')).toBe(true);
    const prices = await plp.getDisplayedProductPrices();
    expect(prices.length).toBeGreaterThan(0);
    for (const price of prices) {
      expect(price).toBeGreaterThanOrEqual(TEST_DATA.priceRange.minValue);
      expect(price).toBeLessThanOrEqual(TEST_DATA.priceRange.maxValue);
    }
  });

  test('Step 13 - Final product count with all filters is within expected range', async ({ page }) => {
    await page.goto(ALL_FILTERS_URL);
    await page.waitForLoadState('networkidle');
    const countText = await plp.getResultsCountText();
    const match = countText.match(/(\d+)/);
    expect(match).not.toBeNull();
    const count = parseInt(match![1]);
    expect(count).toBeGreaterThan(0);
    expect(count).toBeLessThanOrEqual(30);
  });

  test('Clear All button resets all active filters', async ({ page }) => {
    await plp.openMaterialFilter();
    await plp.selectMaterial(TEST_DATA.materials.brass);
    await page.getByRole('button', { name: /clear all/i }).click();
    await page.waitForLoadState('networkidle');
    expect(await plp.activeTagExists('brass')).toBe(false);
    expect(page.url()).not.toMatch(/[?&]m%5B/);
  });
});
