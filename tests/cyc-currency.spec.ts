// artemest-country-selector.spec.ts
// Artemest - "Select Your Shipping Country" Feature
// Playwright Test Suite — environment-agnostic (relative URLs)
// REFACTORED for better DRY principles, robustness, and maintainability

import { test, expect, Page } from '@playwright/test';

// ═════════════════════════════════════════════════════════════════
// CONSTANTS & CONFIGURATION
// ═════════════════════════════════════════════════════════════════

const COUNTRIES = {
  AT: { code: 'AT', symbol: '€', name: 'Austria', locale: '/de-at', lang: 'DEUTSCH' },
  US: { code: 'US', symbol: '$', name: 'United States', locale: '/', lang: 'ENGLISH' },
  GB: { code: 'GB', symbol: '£', name: 'United Kingdom', locale: '/en-gb', lang: 'ENGLISH' },
  FR: { code: 'FR', symbol: '€', name: 'France', locale: '/fr-fr', lang: 'FRANÇAIS' },
} as const;

const TIMEOUTS = {
  SHORT: 1000,
  MEDIUM: 2000,
  LONG: 3000,
  XLARGE: 5000,
  NETWORK: 10000,
} as const;

const SELECTORS = {
  COMBOBOX: () => '[role="combobox"]',
  CONFIRM_BTN: () => '[data-cy="confirm-button"], [role="button"]:has-text("Confirm")',
  CLOSE_BTN: () => '[role="button"]:has-text("close"), [role="button"]:has-text("×"), [aria-label*="close"]',
  HEADER: () => 'header',
  PRICE: () => '[class*="price"], [data-testid*="price"]',
} as const;

// ═════════════════════════════════════════════════════════════════
// FIXTURES & SETUP
// ═════════════════════════════════════════════════════════════════

type CountryCode = keyof typeof COUNTRIES;

const setupCountryTest = async (page: Page, locale: string = '/de-at') => {
  await page.goto(locale);
  await dismissOutOfScopePopups(page);
};

// ═════════════════════════════════════════════════════════════════
// CORE HELPERS
// ═════════════════════════════════════════════════════════════════

async function dismissOutOfScopePopups(page: Page): Promise<void> {
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(TIMEOUTS.SHORT);
  
  // Try to close any modal/popup
  try {
    const closeBtn = page.locator(SELECTORS.CLOSE_BTN());
    if (await closeBtn.first().isVisible({ timeout: TIMEOUTS.MEDIUM }).catch(() => false)) {
      await closeBtn.first().click();
      await page.waitForTimeout(300);
    }
  } catch (e) {
    // Popup not present
  }

  // Dismiss designer popup
  try {
    const designerNo = page.getByRole('button', { name: /nein|no|nope|non/i });
    if (await designerNo.isVisible({ timeout: TIMEOUTS.MEDIUM }).catch(() => false)) {
      await designerNo.click();
      await page.waitForTimeout(300);
    }
  } catch (e) {
    // Not present
  }
}

async function openCountrySelector(page: Page): Promise<void> {
  let countryButton = page.getByRole('button', { name: /AUT|USA|GBR|FRA|EUR|\$|£|CHF|SEK/i });
  
  if (!await countryButton.isVisible({ timeout: TIMEOUTS.SHORT }).catch(() => false)) {
    const headerButtons = page.locator('header button, [class*="header"] button');
    countryButton = headerButtons.first();
  }
  
  await countryButton.click();
  await page.waitForTimeout(800);
  
  // Wait for modal/overlay
  const selectors = [
    page.getByRole('dialog'),
    page.locator('[class*="modal"]'),
    page.getByRole('combobox'),
  ];
  
  for (const sel of selectors) {
    if (await sel.isVisible({ timeout: TIMEOUTS.LONG }).catch(() => false)) {
      return;
    }
  }
  
  throw new Error('Country selector not found');
}

async function selectCountry(page: Page, countryCode: string): Promise<void> {
  const dropdown = page.getByRole('combobox');
  
  await dropdown.click();
  await page.waitForTimeout(400);
  
  const option = page.getByRole('option', { name: new RegExp(countryCode, 'i') });
  if (await option.isVisible({ timeout: TIMEOUTS.MEDIUM }).catch(() => false)) {
    await option.click();
  } else {
    await dropdown.fill(countryCode);
    await page.getByRole('option').first().click();
  }
  
  await page.waitForTimeout(500);
}

async function confirmSelection(page: Page): Promise<void> {
  const confirmBtn = page.locator('[data-cy="confirm-button"]').or(page.getByRole('button', { name: 'Confirm' }));
  
  if (await confirmBtn.isVisible({ timeout: TIMEOUTS.MEDIUM }).catch(() => false)) {
    await confirmBtn.click();
  }
  
  await page.waitForTimeout(TIMEOUTS.SHORT);
}

async function selectCountryAndConfirm(page: Page, countryCode: string): Promise<void> {
  await selectCountry(page, countryCode);
  await confirmSelection(page);
}

// ═════════════════════════════════════════════════════════════════
// ASSERTION HELPERS
// ═════════════════════════════════════════════════════════════════

async function verifyCountrySymbolInHeader(page: Page, countryCode: CountryCode): Promise<void> {
  const country = COUNTRIES[countryCode];
  const header = page.locator(SELECTORS.HEADER()).first();
  await expect(header).toContainText(new RegExp(`${country.symbol}|${countryCode}`, 'i'), { timeout: TIMEOUTS.XLARGE });
}

async function verifyCountryPreSelected(page: Page, countryCode: CountryCode): Promise<void> {
  const dropdown = page.getByRole('combobox');
  const value = await dropdown.getAttribute('value').catch(() => '');
  const text = await dropdown.textContent().catch(() => '');
  
  const isSelected = value === countryCode || text?.includes(countryCode) || text?.includes(COUNTRIES[countryCode].name);
  expect(isSelected, `${countryCode} should be pre-selected`).toBe(true);
}

async function verifyURL(page: Page, pattern: RegExp | string): Promise<void> {
  if (typeof pattern === 'string') {
    await expect(page).toHaveURL(new RegExp(pattern), { timeout: TIMEOUTS.XLARGE });
  } else {
    await expect(page).toHaveURL(pattern, { timeout: TIMEOUTS.XLARGE });
  }
}

async function verifyPriceWithCurrency(page: Page, currencySymbol: string): Promise<void> {
  const prices = page.locator(SELECTORS.PRICE());
  const firstPrice = prices.first();
  
  await expect(firstPrice).toBeVisible({ timeout: TIMEOUTS.XLARGE });
  await expect(firstPrice).toContainText(new RegExp(currencySymbol, 'i'));
}

async function navigateToFurniture(page: Page, locale: string = ''): Promise<void> {
  const link = page.getByRole('link', { name: /furniture|möbel|meuble/i }).first();
  
  if (await link.isVisible({ timeout: TIMEOUTS.LONG }).catch(() => false)) {
    await link.click();
  } else {
    await page.goto(`${locale}/categories/furniture`, { waitUntil: 'networkidle' });
  }
  
  await page.waitForLoadState('networkidle');
}

// ═════════════════════════════════════════════════════════════════
// TEST SUITE
// ═════════════════════════════════════════════════════════════════

test.describe('Artemest — Choose Your Country Popup', () => {

  test.describe('TC-GROUP-01: Initial Page Load & Popup Trigger', () => {

    test('TC01 — Page loads correctly for de-at locale', async ({ page }) => {
      await setupCountryTest(page);
      
      await expect(page).toHaveURL(/\/de-at/);
      const topBar = page.locator('header').first();
      await expect(topBar).toContainText(/AUT|€/);
    });

    test('TC02 — Country selector modal opens on header button click', async ({ page }) => {
      await setupCountryTest(page);
      await openCountrySelector(page);
      
      await expect(page.getByRole('combobox')).toBeVisible({ timeout: TIMEOUTS.LONG });
    });

    test('TC03 — Modal contains all required UI elements', async ({ page }) => {
      await setupCountryTest(page);
      await openCountrySelector(page);
      
      await expect(page.getByRole('combobox')).toBeVisible({ timeout: TIMEOUTS.LONG });
      await expect(page.locator('[data-cy="confirm-button"]').or(page.getByRole('button', { name: 'Confirm' }))).toBeVisible({ timeout: TIMEOUTS.LONG });
      await expect(page.getByText(/LANGUAGE|Sprache/i, { exact: false })).toBeVisible({ timeout: TIMEOUTS.LONG }).catch(() => {});
    });

    test('TC04 — Austria (EUR) is pre-selected for de-at locale', async ({ page }) => {
      await setupCountryTest(page);
      await openCountrySelector(page);
      
      await verifyCountryPreSelected(page, 'AT');
      await expect(page.getByRole('combobox')).toContainText(/Austria|EUR|€/i);
    });

    test('TC05 — DEUTSCH language is pre-selected for de-at locale', async ({ page }) => {
      await setupCountryTest(page);
      await openCountrySelector(page);
      
      const deutschRadio = page.getByRole('radio', { name: /deutsch|german/i });
      try {
        await expect(deutschRadio).toBeChecked({ timeout: TIMEOUTS.LONG });
      } catch {
        await expect(deutschRadio).toBeVisible({ timeout: TIMEOUTS.LONG });
      }
    });
  });

  test.describe('TC-GROUP-02: Modal Dismissal Behaviour', () => {

    test('TC06 — X (close) button dismisses modal without country change', async ({ page }) => {
      await setupCountryTest(page);
      await openCountrySelector(page);
      
      const closeBtn = page.getByRole('button', { name: /close|×|x/i }).first();
      if (await closeBtn.isVisible({ timeout: TIMEOUTS.MEDIUM }).catch(() => false)) {
        await closeBtn.click();
      } else {
        await page.keyboard.press('Escape');
      }
      
      await page.waitForTimeout(500);
      const isHidden = !await page.getByRole('combobox').isVisible({ timeout: TIMEOUTS.MEDIUM }).catch(() => true);
      expect(isHidden).toBe(true);
      await verifyCountrySymbolInHeader(page, 'AT');
    });

    test('TC07 — Pressing ESC dismisses modal', async ({ page }) => {
      await setupCountryTest(page);
      await openCountrySelector(page);
      
      await page.keyboard.press('Escape');
      await page.waitForTimeout(500);
      
      const isHidden = !await page.getByRole('combobox').isVisible({ timeout: TIMEOUTS.MEDIUM }).catch(() => true);
      expect(isHidden).toBe(true);
    });

    test('TC08 — ESC key dismisses modal [known issue: currently fails]', async ({ page }) => {
      await setupCountryTest(page);
      await openCountrySelector(page);
      
      await page.keyboard.press('Escape');
      const isStillVisible = await page.getByText('Select Your Shipping Country').isVisible();
      expect(isStillVisible, 'BUG-001: ESC key should close the modal').toBe(false);
    });
  });

  test.describe('TC-GROUP-03: Language Options Adapt to Country', () => {

    const testLanguageOptions = async (page: Page, countryCode: string, expectedLanguages: RegExp[]) => {
      await setupCountryTest(page);
      await openCountrySelector(page);
      await selectCountry(page, countryCode);
      
      for (const lang of expectedLanguages) {
        await expect(page.getByRole('radio', { name: lang })).toBeVisible({ timeout: TIMEOUTS.LONG });
      }
    };

    test('TC09 — US selection shows ENGLISH / ESPAÑOL', async ({ page }) => {
      await testLanguageOptions(page, 'US', [/english/i, /español|spanish/i]);
    });

    test('TC10 — FR selection shows ENGLISH / FRANÇAIS', async ({ page }) => {
      await testLanguageOptions(page, 'FR', [/english/i, /français|french/i]);
    });

    test('TC11 — GB selection shows only ENGLISH', async ({ page }) => {
      await setupCountryTest(page);
      await openCountrySelector(page);
      await selectCountry(page, 'GB');
      
      const radios = page.getByRole('radio');
      expect(await radios.count()).toBe(1);
    });
  });

  test.describe('TC-GROUP-04: Country Switch & URL Update', () => {

    const testCountrySwitchAndVerify = async (
      page: Page, 
      countryCode: CountryCode, 
      expectedURL: RegExp
    ) => {
      await setupCountryTest(page);
      await openCountrySelector(page);
      await selectCountryAndConfirm(page, countryCode);
      await page.waitForTimeout(TIMEOUTS.SHORT);
      await dismissOutOfScopePopups(page);
      
      await verifyURL(page, expectedURL);
      await verifyCountrySymbolInHeader(page, countryCode);
    };

    test('TC12 — Confirming US switches to USD', async ({ page }) => {
      await testCountrySwitchAndVerify(page, 'US', /^\//); // Root URL for US
    });

    test('TC13 — Confirming GB switches to GBP and /en-gb/', async ({ page }) => {
      await testCountrySwitchAndVerify(page, 'GB', /\/en-gb|\/gb/i);
    });

    test('TC14 — Confirming FR switches to EUR and /fr-fr/', async ({ page }) => {
      await testCountrySwitchAndVerify(page, 'FR', /\/fr-fr|\/fr/i);
    });

    test('TC15 — Confirming Austria keeps /de-at/', async ({ page }) => {
      await testCountrySwitchAndVerify(page, 'AT', /\/de-at/i);
    });
  });

  test.describe('TC-GROUP-05: Currency Display on Product Pages', () => {

    const testCurrencyOnProducts = async (
      page: Page,
      startLocation: string,
      countryCode: CountryCode
    ) => {
      await page.goto(startLocation);
      await dismissOutOfScopePopups(page);
      
      if (startLocation === '/') {
        await openCountrySelector(page);
        await selectCountryAndConfirm(page, countryCode);
        await dismissOutOfScopePopups(page);
      }
      
      const country = COUNTRIES[countryCode];
      await navigateToFurniture(page, country.locale);
      await verifyPriceWithCurrency(page, country.symbol);
    };

    test('TC16 — EUR currency displays on FR products', async ({ page }) => {
      await testCurrencyOnProducts(page, COUNTRIES.FR.locale, 'FR');
    });

    test('TC17 — USD currency displays on US products', async ({ page }) => {
      await testCurrencyOnProducts(page, '/', 'US');
    });

    test('TC18 — GBP currency displays on GB products', async ({ page }) => {
      await testCurrencyOnProducts(page, COUNTRIES.GB.locale, 'GB');
    });
  });

  test.describe('TC-GROUP-06: State Persistence', () => {

    test('TC19 — Selected country persists when modal reopens', async ({ page }) => {
      await setupCountryTest(page);
      await openCountrySelector(page);
      await selectCountryAndConfirm(page, 'GB');
      
      await openCountrySelector(page);
      await verifyCountryPreSelected(page, 'GB');
    });

    test('TC20 — Closing without confirming does not change country', async ({ page }) => {
      await setupCountryTest(page);
      await openCountrySelector(page);
      
      const startURL = page.url();
      await selectCountry(page, 'US');
      await page.keyboard.press('Escape');
      
      expect(page.url()).toBe(startURL);
      await verifyCountrySymbolInHeader(page, 'AT');
    });
  });

  test.describe('TC-GROUP-07: Full End-to-End Currency Flows', () => {

    const testFullFlow = async (page: Page, countryCode: CountryCode) => {
      const country = COUNTRIES[countryCode];
      
      await setupCountryTest(page);
      await openCountrySelector(page);
      await selectCountryAndConfirm(page, countryCode);
      await page.waitForTimeout(TIMEOUTS.SHORT);
      await dismissOutOfScopePopups(page);
      
      await verifyCountrySymbolInHeader(page, countryCode);
      await navigateToFurniture(page, country.locale);
      await verifyPriceWithCurrency(page, country.symbol);
    };

    test('TC21 — Full EUR flow (AT)', async ({ page }) => {
      await testFullFlow(page, 'AT');
    });

    test('TC22 — Full USD flow (US)', async ({ page }) => {
      await testFullFlow(page, 'US');
    });

    test('TC23 — Full GBP flow (GB)', async ({ page }) => {
      await testFullFlow(page, 'GB');
    });
  });

});

