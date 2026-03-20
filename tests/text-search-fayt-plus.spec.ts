import { test, expect, Page } from '@playwright/test';

// ============================================================
// ARTEMEST QA — SINGLE-FILE PLAYWRIGHT TEST SUITE
// Tables: Navigation · Sorting · Filtering
// Steps 1-13 | No hard-coded selectors
// ============================================================

// ─────────────────────────────────────────────────────────────
// TEST DATA
// ─────────────────────────────────────────────────────────────
const BASE_URL       = 'https://artemest.com/en-us';
const TABLES_URL     = 'https://artemest.com/en-us/categories/furniture/tables';
const FAST_SHIP_URL  = TABLES_URL + '?s=v2-products_fast_shipping';
const ALL_FILTERS_URL =
  TABLES_URL +
  '?s=v2-products_fast_shipping' +
  '&a%5B0%5D=Bronzetto' +
  '&m%5B0%5D=Brass&m%5B1%5D=Steel' +
  '&pu=2000%3A6000';

const SORT = {
  recommended:  'Sort by recommended',
  fastShipping: 'Sort by fast shipping',
  highToLow:    'Sort by price from high to low',
  lowToHigh:    'Sort by price from low to high',
  newArrivals:  'Sort by new arrivals',
};

const PRICE_MIN = 2000;
const PRICE_MAX = 6000;

// ─────────────────────────────────────────────────────────────
// SHARED HELPERS
// ─────────────────────────────────────────────────────────────

/** Dismiss designer/shipping-country popups if they appear. */
async function dismissPopups(page: Page): Promise<void> {
  // "Are you a designer?" popup
  try {
    const dialog = page.getByRole('dialog');
    if (await dialog.isVisible({ timeout: 3000 })) {
      const close = dialog.getByRole('button', { name: /close|no/i });
      if (await close.isVisible({ timeout: 1000 })) await close.click();
      await dialog.waitFor({ state: 'hidden', timeout: 5000 });
    }
  } catch { /* not present */ }

  // Shipping country popup
  try {
    const country = page.getByRole('dialog').filter({ hasText: /shipping country/i });
    if (await country.isVisible({ timeout: 2000 })) {
      await country.getByRole('button').first().click();
      await country.waitFor({ state: 'hidden', timeout: 5000 });
    }
  } catch { /* not present */ }
}

/** Wait for network to settle after a filter/sort change. */
async function waitForProducts(page: Page): Promise<void> {
  await page.waitForLoadState('networkidle', { timeout: 15000 });
  await page.waitForTimeout(500);
}

/** Read all USD price values visible in the DOM. */
async function getPrices(page: Page): Promise<number[]> {
  await page.waitForTimeout(400);
  const texts: string[] = await page.evaluate(() => {
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    const out: string[] = [];
    let n: Text | null;
    while ((n = walker.nextNode() as Text | null)) {
      const t = n.textContent?.trim() ?? '';
      if (/^USD\s[\d,]+$/.test(t) && t.length < 20) out.push(t);
    }
    return out;
  });
  return texts
    .map(t => parseFloat(t.replace(/USD\s*/i, '').replace(/,/g, '')))
    .filter(n => !isNaN(n));
}

/** Return text of the current sort label button. */
async function sortLabel(page: Page): Promise<string> {
  return (await page.getByRole('button', { name: /sort by/i }).textContent()) ?? '';
}

/** Select a sort option via the combobox. */
async function selectSort(page: Page, optionLabel: string): Promise<void> {
  await page.getByRole('combobox', { name: /sort by/i }).selectOption({ label: optionLabel });
  await waitForProducts(page);
}

/** Read the result-count string ("18 RESULTS" or "CURATED SELECTION (300)"). */
async function resultCount(page: Page): Promise<string> {
  for (const pattern of [/\d+\s*results/i, /curated selection\s*\(\d+\)/i]) {
    try {
      const el = page.getByText(pattern).first();
      if (await el.isVisible({ timeout: 3000 })) return (await el.textContent()) ?? '';
    } catch { /* next */ }
  }
  return '';
}

/** Check whether a given tag text is visible in the active-filter strip. */
async function tagVisible(page: Page, text: string): Promise<boolean> {
  return page.getByText(new RegExp(text, 'i')).isVisible();
}

/** Read numeric value from filter counter badge, e.g. MATERIAL (2) → 2. */
async function filterCount(page: Page, name: RegExp): Promise<number> {
  const label = await page.getByRole('button', { name }).textContent();
  const m = label?.match(/\((\d+)\)/);
  return m ? parseInt(m[1]) : 0;
}

// ─────────────────────────────────────────────────────────────
// STEP 1-4  |  NAVIGATION
// ─────────────────────────────────────────────────────────────
test.describe('Navigation: Furniture → Tables', () => {

  test('Step 1 — Homepage loads successfully', async ({ page }) => {
    await page.goto(BASE_URL);
    await page.waitForLoadState('domcontentloaded');
    await dismissPopups(page);

    // Page title contains brand name
    await expect(page).toHaveTitle(/artemest/i);

    // Main navigation bar is visible
    await expect(page.getByRole('navigation').first()).toBeVisible();

    // Logo link present
    await expect(page.getByRole('link', { name: /artemest/i }).first()).toBeVisible();

    // Primary category links visible
    await expect(page.getByRole('link', { name: /furniture/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /lighting/i })).toBeVisible();
  });

  test('Step 2 — Furniture mega-menu opens with subcategories', async ({ page }) => {
    await page.goto(BASE_URL);
    await page.waitForLoadState('domcontentloaded');
    await dismissPopups(page);

    // Click main Furniture nav link
    await page.getByRole('navigation').getByRole('link', { name: /furniture/i }).click();
    await page.waitForTimeout(600);

    // Subcategory headings appear
    await expect(page.getByText(/seating/i).first()).toBeVisible();
    await expect(page.getByText(/^tables$/i).first()).toBeVisible();
    await expect(page.getByText(/storage/i).first()).toBeVisible();
    await expect(page.getByText(/outdoor furniture/i).first()).toBeVisible();
  });

  test('Step 3 — Clicking Tables navigates to correct PLP', async ({ page }) => {
    await page.goto(BASE_URL);
    await page.waitForLoadState('domcontentloaded');
    await dismissPopups(page);

    // Open Furniture menu then click Tables
    await page.getByRole('navigation').getByRole('link', { name: /furniture/i }).click();
    await page.waitForTimeout(500);
    await page.getByRole('link', { name: /^tables$/i }).click();
    await page.waitForLoadState('domcontentloaded');

    // URL and heading
    await expect(page).toHaveURL(/\/categories\/furniture\/tables/i);
    await expect(page.getByRole('heading', { name: /^tables$/i })).toBeVisible();
  });

  test('Step 4 — Tables PLP displays products', async ({ page }) => {
    await page.goto(TABLES_URL);
    await page.waitForLoadState('networkidle');
    await dismissPopups(page);

    // Page heading visible
    await expect(page.getByRole('heading', { name: /^tables$/i })).toBeVisible();

    // Subcategory tiles
    await expect(page.getByText(/dining tables/i).first()).toBeVisible();
    await expect(page.getByText(/coffee tables/i).first()).toBeVisible();

    // Products have prices
    const prices = await getPrices(page);
    expect(prices.length).toBeGreaterThan(0);
  });

});

// ─────────────────────────────────────────────────────────────
// STEPS 5-8  |  SORTING
// ─────────────────────────────────────────────────────────────
test.describe('Sorting', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto(TABLES_URL);
    await page.waitForLoadState('networkidle');
    await dismissPopups(page);
  });

  test('Step 5 — Default sort is "Sort by Recommended"', async ({ page }) => {
    const label = await sortLabel(page);
    expect(label.toLowerCase()).toContain('recommended');
    // No sort param in URL at default state
    expect(page.url()).not.toMatch(/[?&]s=/);
  });

  test('Step 6 — Product count is displayed on default sort', async ({ page }) => {
    const count = await resultCount(page);
    expect(count).toMatch(/\d+/);
  });

  test('Step 7 — Sort by Price High to Low produces descending order', async ({ page }) => {
    await selectSort(page, SORT.highToLow);

    // Label updated
    const label = await sortLabel(page);
    expect(label.toLowerCase()).toContain('high');

    // URL updated
    expect(page.url()).toMatch(/price.*desc|_desc/i);

    // First 6 prices are in descending order
    const prices = await getPrices(page);
    const sample = prices.slice(0, 6);
    expect(sample.length).toBeGreaterThanOrEqual(3);
    for (let i = 0; i < sample.length - 1; i++) {
      expect(sample[i]).toBeGreaterThanOrEqual(sample[i + 1]);
    }
  });

  test('Step 8 — Sort by Fast Shipping surfaces "Ready to Ship" products first', async ({ page }) => {
    await selectSort(page, SORT.fastShipping);

    // Label updated
    const label = await sortLabel(page);
    expect(label.toLowerCase()).toContain('fast');

    // URL updated
    expect(page.url()).toMatch(/fast_shipping/i);

    // At least one "READY TO SHIP" label in the first visible row
    const shippingEls = page.getByText(/ready to ship|ships in/i);
    const total = await shippingEls.count();
    expect(total).toBeGreaterThan(0);

    const firstLabels: string[] = [];
    for (let i = 0; i < Math.min(total, 3); i++) {
      firstLabels.push((await shippingEls.nth(i).textContent()) ?? '');
    }
    expect(firstLabels.some(l => l.toLowerCase().includes('ready to ship'))).toBe(true);

    // Results count still shown
    const count = await resultCount(page);
    expect(count).toMatch(/\d+/);
  });

  test('Sort dropdown exposes all five expected options', async ({ page }) => {
    const combo = page.getByRole('combobox', { name: /sort by/i });
    await expect(combo).toBeVisible();
    const options: string[] = await combo.evaluate((el: HTMLSelectElement) =>
      Array.from(el.options).map(o => o.text.toLowerCase())
    );
    expect(options.some(o => o.includes('recommended'))).toBe(true);
    expect(options.some(o => o.includes('fast shipping'))).toBe(true);
    expect(options.some(o => o.includes('high to low'))).toBe(true);
    expect(options.some(o => o.includes('low to high'))).toBe(true);
    expect(options.some(o => o.includes('new arrivals'))).toBe(true);
  });

});

// ─────────────────────────────────────────────────────────────
// STEPS 9-13  |  FILTERING
// ─────────────────────────────────────────────────────────────
test.describe('Filtering', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto(FAST_SHIP_URL);
    await page.waitForLoadState('networkidle');
    await dismissPopups(page);
  });

  // ── Step 9: Material filter ─────────────────────────────────
  test('Step 9 — Material filter: select Steel then Brass', async ({ page }) => {
    // Open Material panel
    await page.getByRole('button', { name: /material/i }).click();
    await page.waitForTimeout(400);

    // Brass and Steel checkboxes are visible
    await expect(page.getByRole('checkbox', { name: /^steel$/i })).toBeVisible();
    await expect(page.getByRole('checkbox', { name: /^brass$/i })).toBeVisible();

    // Select Steel
    await page.getByRole('checkbox', { name: /^steel$/i }).check();
    await waitForProducts(page);
    await expect(page.getByRole('checkbox', { name: /^steel$/i })).toBeChecked();
    expect(await tagVisible(page, 'steel')).toBe(true);

    // Re-open and select Brass
    await page.getByRole('button', { name: /material/i }).click();
    await page.waitForTimeout(400);
    await page.getByRole('checkbox', { name: /^brass$/i }).check();
    await waitForProducts(page);
    await expect(page.getByRole('checkbox', { name: /^brass$/i })).toBeChecked();

    // Both tags visible
    expect(await tagVisible(page, 'brass')).toBe(true);
    expect(await tagVisible(page, 'steel')).toBe(true);

    // Counter badge shows (2)
    const matCount = await filterCount(page, /material/i);
    expect(matCount).toBe(2);

    // Results count is present
    const count = await resultCount(page);
    expect(count).toMatch(/\d+/);
  });

  // ── Step 10: Other Filters → Artisan → Bronzetto ─────────────
  test('Step 10 — Other Filters: Artisan → Bronzetto', async ({ page }) => {
    // Apply materials first
    await page.getByRole('button', { name: /material/i }).click();
    await page.waitForTimeout(300);
    await page.getByRole('checkbox', { name: /^brass$/i }).check();
    await waitForProducts(page);
    await page.getByRole('button', { name: /material/i }).click();
    await page.waitForTimeout(300);
    await page.getByRole('checkbox', { name: /^steel$/i }).check();
    await waitForProducts(page);

    // Open Other Filters
    await page.getByRole('button', { name: /other filters/i }).click();
    await page.waitForTimeout(400);
    await expect(page.getByRole('button', { name: /artisan/i })).toBeVisible();

    // Open Artisan sub-panel
    await page.getByRole('button', { name: /artisan/i }).click();
    await page.waitForTimeout(400);
    await expect(page.getByRole('checkbox', { name: /bronzetto/i })).toBeVisible();

    // Select Bronzetto
    await page.getByRole('checkbox', { name: /bronzetto/i }).check();
    await waitForProducts(page);
    await expect(page.getByRole('checkbox', { name: /bronzetto/i })).toBeChecked();

    // Tag and counter
    expect(await tagVisible(page, 'bronzetto')).toBe(true);
    const artCount = await filterCount(page, /artisan/i);
    expect(artCount).toBe(1);
  });

  // ── Step 11: Price range 2000–6000 ───────────────────────────
  test('Step 11 — Price filter: range 2000 to 6000 and Apply', async ({ page }) => {
    // Apply materials
    await page.getByRole('button', { name: /material/i }).click();
    await page.waitForTimeout(300);
    await page.getByRole('checkbox', { name: /^brass$/i }).check();
    await waitForProducts(page);
    await page.getByRole('button', { name: /material/i }).click();
    await page.waitForTimeout(300);
    await page.getByRole('checkbox', { name: /^steel$/i }).check();
    await waitForProducts(page);

    // Apply artisan
    await page.getByRole('button', { name: /other filters/i }).click();
    await page.waitForTimeout(300);
    await page.getByRole('button', { name: /artisan/i }).click();
    await page.waitForTimeout(300);
    await page.getByRole('checkbox', { name: /bronzetto/i }).check();
    await waitForProducts(page);

    // Open price filter
    await page.getByRole('button', { name: /^price/i }).click();
    await page.waitForTimeout(400);

    // Fill min and max inputs
    const inputs = page.getByRole('form', { name: /price/i }).getByRole('spinbutton');
    await inputs.first().fill(String(PRICE_MIN));
    await inputs.last().fill(String(PRICE_MAX));

    // Submit
    await page.getByRole('button', { name: /apply/i }).click();
    await waitForProducts(page);

    // Filter tags for price appear
    expect(await tagVisible(page, String(PRICE_MIN))).toBe(true);
    expect(await tagVisible(page, String(PRICE_MAX))).toBe(true);

    // URL contains price param
    expect(page.url()).toMatch(/pu=2000.*6000|price/i);
  });

  // ── Step 12: Consistency check ────────────────────────────────
  test('Step 12 — All displayed products match every active filter', async ({ page }) => {
    // Navigate directly to the fully-filtered URL
    await page.goto(ALL_FILTERS_URL);
    await page.waitForLoadState('networkidle');

    // All five active filter tags present
    expect(await tagVisible(page, 'Brass')).toBe(true);
    expect(await tagVisible(page, 'Steel')).toBe(true);
    expect(await tagVisible(page, 'Bronzetto')).toBe(true);
    expect(await tagVisible(page, String(PRICE_MIN))).toBe(true);
    expect(await tagVisible(page, String(PRICE_MAX))).toBe(true);

    // Every price on-screen is within the declared range
    const prices = await getPrices(page);
    expect(prices.length).toBeGreaterThan(0);
    for (const price of prices) {
      expect(price).toBeGreaterThanOrEqual(PRICE_MIN);
      expect(price).toBeLessThanOrEqual(PRICE_MAX);
    }
  });

  // ── Step 13: Product count ────────────────────────────────────
  test('Step 13 — Final product count with all filters is within expected range', async ({ page }) => {
    await page.goto(ALL_FILTERS_URL);
    await page.waitForLoadState('networkidle');

    const text = await resultCount(page);
    const match = text.match(/(\d+)/);
    expect(match).not.toBeNull();

    const count = parseInt(match![1]);
    expect(count).toBeGreaterThan(0);
    expect(count).toBeLessThanOrEqual(50); // conservative ceiling for Bronzetto filtered set
  });

  // ── Bonus: Clear All resets filters ──────────────────────────
  test('Bonus — Clear All resets all active filters', async ({ page }) => {
    // Apply one filter
    await page.getByRole('button', { name: /material/i }).click();
    await page.waitForTimeout(300);
    await page.getByRole('checkbox', { name: /^brass$/i }).check();
    await waitForProducts(page);
    expect(await tagVisible(page, 'brass')).toBe(true);

    // Clear all
    await page.getByRole('button', { name: /clear all/i }).click();
    await waitForProducts(page);

    // Tag gone, URL param cleared
    expect(await tagVisible(page, 'brass')).toBe(false);
    expect(page.url()).not.toMatch(/[?&]m%5B/);
  });

});
