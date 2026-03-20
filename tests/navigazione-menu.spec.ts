import { test, expect } from '@playwright/test';
import { HomePage } from '../pages/HomePage';
import { ProductListPage } from '../pages/ProductListPage';
import { TEST_DATA } from '../fixtures/testData';

test.describe('Artemest Navigation: Furniture > Tables', () => {
  let homePage: HomePage;
  let plp: ProductListPage;

  test.beforeEach(async ({ page }) => {
    homePage = new HomePage(page);
    plp = new ProductListPage(page);
  });

  test('Step 1 - Homepage loads successfully', async ({ page }) => {
    await homePage.navigate(TEST_DATA.baseUrl);
    const title = await page.title();
    expect(title).toMatch(/artemest/i);
    await expect(page.getByRole('navigation')).toBeVisible();
    await expect(
      page.getByRole('link', { name: /artemest/i }).first()
    ).toBeVisible();
    await expect(
      page.getByRole('link', { name: /furniture/i })
    ).toBeVisible();
  });

  test('Step 2 - Furniture menu opens with subcategories', async ({ page }) => {
    await homePage.navigate(TEST_DATA.baseUrl);
    await homePage.clickMainMenuCategory(TEST_DATA.navigation.furniture);
    await expect(page.getByText(/seating/i).first()).toBeVisible();
    await expect(page.getByText(/tables/i).first()).toBeVisible();
    await expect(page.getByText(/storage/i).first()).toBeVisible();
    await expect(page.getByText(/outdoor furniture/i).first()).toBeVisible();
  });

  test('Step 3 - Tables subcategory navigates to correct page', async ({ page }) => {
    await homePage.navigate(TEST_DATA.baseUrl);
    await homePage.clickMainMenuCategory(TEST_DATA.navigation.furniture);
    await homePage.clickSubMenuCategory(TEST_DATA.navigation.tables);
    await expect(page).toHaveURL(/\/categories\/furniture\/tables/i);
    await expect(
      page.getByRole('heading', { name: /^tables$/i })
    ).toBeVisible();
  });

  test('Step 4 - Tables PLP displays products', async ({ page }) => {
    await page.goto(TEST_DATA.tablesUrl);
    const loaded = await plp.isLoaded();
    expect(loaded).toBe(true);
    const prices = await plp.getDisplayedProductPrices();
    expect(prices.length).toBeGreaterThan(0);
    await expect(page.getByText(/dining tables/i).first()).toBeVisible();
    await expect(page.getByText(/coffee tables/i).first()).toBeVisible();
  });
});
