// artemest-country-selector.spec.ts
// Artemest - "Select Your Shipping Country" Feature
// Playwright Test Suite — environment-agnostic (relative URLs)

import { test, expect, Page } from '@playwright/test';

// ─────────────────────────────────────────────
// HELPER: Dismiss out-of-scope popups
// ─────────────────────────────────────────────
async function dismissOutOfScopePopups(page: Page): Promise<void> {
  // Dismiss "Nazione di spedizione" / shipping country auto-popup if visible
  const shippingPopupClose = page.locator('text=Nazione di spedizione').locator('..').locator('button');
  if (await shippingPopupClose.isVisible({ timeout: 3000 }).catch(() => false)) {
    await shippingPopupClose.click();
    await page.waitForTimeout(300);
  }

  // Dismiss "Are you a designer?" popup if visible (any locale variant)
  const designerPopupNo = page.getByRole('button', { name: /nein|no|nope/i });
  if (await designerPopupNo.isVisible({ timeout: 2000 }).catch(() => false)) {
    await designerPopupNo.click();
    await page.waitForTimeout(300);
  }
}

// ─────────────────────────────────────────────
// HELPER: Open country selector modal
// ─────────────────────────────────────────────
async function openCountrySelector(page: Page): Promise<void> {
  // The country/currency button is in the top bar (first button with globe icon area)
  const countryButton = page.locator('header').getByRole('button').first();
  await countryButton.click();
  await expect(
    page.getByText('Select Your Shipping Country')
  ).toBeVisible({ timeout: 5000 });
}

// ─────────────────────────────────────────────
// HELPER: Select country and confirm
// ─────────────────────────────────────────────
async function selectCountryAndConfirm(page: Page, countryValue: string): Promise<void> {
  const countryDropdown = page.getByRole('combobox');
  await countryDropdown.selectOption(countryValue);
  await page.getByRole('button', { name: /confirm/i }).click();
  await expect(page.getByText('Select Your Shipping Country')).not.toBeVisible({ timeout: 5000 });
}

// ─────────────────────────────────────────────
// TEST SUITE
// ─────────────────────────────────────────────
test.describe('Artemest — Choose Your Country Popup', () => {

  test.describe('TC-GROUP-01: Initial Page Load & Popup Trigger', () => {

    test('TC01 — Page loads correctly for de-at locale', async ({ page }) => {
      await page.goto('/de-at');
      await dismissOutOfScopePopups(page);

      // Verify page loaded in German locale
      await expect(page).toHaveURL(/\/de-at/);
      // Header should show AUT (€) or similar Euro indicator for Austria
      const topBar = page.locator('header, [data-testid="top-bar"], nav').first();
      await expect(topBar).toContainText(/AUT|€/);
    });

    test('TC02 — Country selector modal opens on header button click', async ({ page }) => {
      await page.goto('/de-at');
      await dismissOutOfScopePopups(page);
      await openCountrySelector(page);

      await expect(page.getByText('Select Your Shipping Country')).toBeVisible();
    });

    test('TC03 — Modal contains all required UI elements', async ({ page }) => {
      await page.goto('/de-at');
      await dismissOutOfScopePopups(page);
      await openCountrySelector(page);

      // Title
      await expect(page.getByText('Select Your Shipping Country')).toBeVisible();
      // Country label
      await expect(page.getByText('COUNTRY')).toBeVisible();
      // Country dropdown
      await expect(page.getByRole('combobox')).toBeVisible();
      // Confirm button
      await expect(page.getByRole('button', { name: /confirm/i })).toBeVisible();
      // Close (X) button
      const closeBtn = page.getByRole('dialog').getByRole('button').first();
      await expect(closeBtn).toBeVisible();
      // Language section
      await expect(page.getByText('LANGUAGE')).toBeVisible();
    });

    test('TC04 — Austria (EUR) is pre-selected for de-at locale', async ({ page }) => {
      await page.goto('/de-at');
      await dismissOutOfScopePopups(page);
      await openCountrySelector(page);

      const dropdown = page.getByRole('combobox');
      await expect(dropdown).toHaveValue('AT');
      // Dropdown should display Austria and EUR
      await expect(dropdown).toContainText(/Austria.*EUR/);
    });

    test('TC05 — DEUTSCH language is pre-selected for de-at locale', async ({ page }) => {
      await page.goto('/de-at');
      await dismissOutOfScopePopups(page);
      await openCountrySelector(page);

      const deutschOption = page.getByRole('radio', { name: /deutsch/i });
      await expect(deutschOption).toBeChecked();
    });
  });

  test.describe('TC-GROUP-02: Modal Dismissal Behaviour', () => {

    test('TC06 — X (close) button dismisses modal without country change', async ({ page }) => {
      await page.goto('/de-at');
      await dismissOutOfScopePopups(page);
      await openCountrySelector(page);

      // Click X button
      const closeBtn = page.getByRole('dialog').getByRole('button').first();
      await closeBtn.click();

      // Modal should be gone
      await expect(page.getByText('Select Your Shipping Country')).not.toBeVisible();
      // Header should still show Austria/EUR
      await expect(page.locator('header').first()).toContainText(/AUT|€/);
    });

    test('TC07 — Clicking outside modal (backdrop) dismisses it', async ({ page }) => {
      await page.goto('/de-at');
      await dismissOutOfScopePopups(page);
      await openCountrySelector(page);

      // Click on backdrop (outside modal bounds)
      await page.mouse.click(50, 400);

      await expect(page.getByText('Select Your Shipping Country')).not.toBeVisible({ timeout: 3000 });
    });

    test('TC08 — ESC key dismisses modal [known issue: currently fails]', async ({ page }) => {
      // NOTE: This test documents a known defect — ESC does not dismiss the modal.
      // Update this test to .pass() once the fix is implemented.
      await page.goto('/de-at');
      await dismissOutOfScopePopups(page);
      await openCountrySelector(page);

      await page.keyboard.press('Escape');

      // EXPECTED (post-fix): modal closes
      // ACTUAL (current): modal remains open — marking as known bug
      const isStillVisible = await page.getByText('Select Your Shipping Country').isVisible();
      // Currently the modal stays open; this assertion documents the defect:
      expect(isStillVisible, 'BUG-001: ESC key should close the modal but does not').toBe(false);
    });
  });

  test.describe('TC-GROUP-03: Language Options Adapt to Country', () => {

    test('TC09 — US selection shows ENGLISH / ESPAÑOL with ENGLISH pre-selected', async ({ page }) => {
      await page.goto('/de-at');
      await dismissOutOfScopePopups(page);
      await openCountrySelector(page);

      const dropdown = page.getByRole('combobox');
      await dropdown.selectOption('US');

      await expect(page.getByRole('radio', { name: /english/i })).toBeVisible();
      await expect(page.getByRole('radio', { name: /español/i })).toBeVisible();
      await expect(page.getByRole('radio', { name: /english/i })).toBeChecked();
    });

    test('TC10 — FR selection shows ENGLISH / FRANÇAIS with FRANÇAIS pre-selected', async ({ page }) => {
      await page.goto('/de-at');
      await dismissOutOfScopePopups(page);
      await openCountrySelector(page);

      const dropdown = page.getByRole('combobox');
      await dropdown.selectOption('FR');

      await expect(page.getByRole('radio', { name: /english/i })).toBeVisible();
      await expect(page.getByRole('radio', { name: /français/i })).toBeVisible();
      await expect(page.getByRole('radio', { name: /français/i })).toBeChecked();
    });

    test('TC11 — GB selection shows only ENGLISH', async ({ page }) => {
      await page.goto('/de-at');
      await dismissOutOfScopePopups(page);
      await openCountrySelector(page);

      const dropdown = page.getByRole('combobox');
      await dropdown.selectOption('GB');

      await expect(page.getByRole('radio', { name: /english/i })).toBeVisible();
      await expect(page.getByRole('radio', { name: /english/i })).toBeChecked();
      // No second language option for UK
      const radioButtons = page.getByRole('radio');
      await expect(radioButtons).toHaveCount(1);
    });
  });

  test.describe('TC-GROUP-04: Country Switch & URL Update', () => {

    test('TC12 — Confirming US switches header to USA ($) and URL to root or en-us', async ({ page }) => {
      await page.goto('/de-at');
      await dismissOutOfScopePopups(page);
      await openCountrySelector(page);
      await selectCountryAndConfirm(page, 'US');
      await dismissOutOfScopePopups(page);

      // URL should not contain de-at anymore; US is served from root or /en-us
      await expect(page).not.toHaveURL(/\/de-at/);
      // Header should show USD indicator
      await expect(page.locator('header').first()).toContainText(/USA|\$/);
    });

    test('TC13 — Confirming GB switches header to GBR (£) and URL to /en-gb/', async ({ page }) => {
      await page.goto('/de-at');
      await dismissOutOfScopePopups(page);
      await openCountrySelector(page);
      await selectCountryAndConfirm(page, 'GB');

      await expect(page).toHaveURL(/\/en-gb/);
      await expect(page.locator('header').first()).toContainText(/GBR|£/);
    });

    test('TC14 — Confirming FR switches header to FRA (€) and URL to /fr-fr/', async ({ page }) => {
      await page.goto('/de-at');
      await dismissOutOfScopePopups(page);
      await openCountrySelector(page);
      await selectCountryAndConfirm(page, 'FR');

      await expect(page).toHaveURL(/\/fr-fr/);
      await expect(page.locator('header').first()).toContainText(/FRA|€/);
    });

    test('TC15 — Confirming Austria (EUR) keeps URL as /de-at/', async ({ page }) => {
      await page.goto('/de-at');
      await dismissOutOfScopePopups(page);
      await openCountrySelector(page);
      await selectCountryAndConfirm(page, 'AT');
      await dismissOutOfScopePopups(page);

      await expect(page).toHaveURL(/\/de-at/);
    });
  });

  test.describe('TC-GROUP-05: Currency Display on Product Pages', () => {

    test('TC16 — EUR currency displays correctly on product listing', async ({ page }) => {
      await page.goto('/fr-fr');
      await dismissOutOfScopePopups(page);

      // Navigate to furniture/armchairs
      await page.goto('/fr-fr/categories/mobilier/fauteuils-et-canapes/fauteuils');

      // Find any price element
      const priceLocator = page.locator('[class*="price"], [data-testid*="price"]').first();
      // EUR format: "4880 EUR" or "€4,880"
      await expect(priceLocator).toContainText(/EUR|€/);
    });

    test('TC17 — USD currency displays correctly on product listing', async ({ page }) => {
      await page.goto('/');
      await dismissOutOfScopePopups(page);

      // Ensure USD is active via country selector if not already set
      await openCountrySelector(page);
      await selectCountryAndConfirm(page, 'US');
      await dismissOutOfScopePopups(page);

      await page.goto('/categories/furniture/seating/armchairs-and-sofas');

      const priceLocator = page.locator('[class*="price"], [data-testid*="price"]').first();
      // USD format: "USD 5,635" or "$5,635"
      await expect(priceLocator).toContainText(/USD|\$/);
    });

    test('TC18 — GBP currency displays correctly on product listing', async ({ page }) => {
      await page.goto('/en-gb');
      await dismissOutOfScopePopups(page);

      await page.goto('/en-gb/categories/furniture/seating/armchairs-and-sofas');

      const priceLocator = page.locator('[class*="price"], [data-testid*="price"]').first();
      // GBP format: "GBP 4,390" or "£4,390"
      await expect(priceLocator).toContainText(/GBP|£/);
    });
  });

  test.describe('TC-GROUP-06: State Persistence', () => {

    test('TC19 — Selected country is persisted when modal is re-opened', async ({ page }) => {
      await page.goto('/de-at');
      await dismissOutOfScopePopups(page);

      // Select GB and confirm
      await openCountrySelector(page);
      await selectCountryAndConfirm(page, 'GB');

      // Re-open modal
      await openCountrySelector(page);

      // Dropdown should still show GB
      const dropdown = page.getByRole('combobox');
      await expect(dropdown).toHaveValue('GB');
    });

    test('TC20 — Closing modal without confirming does not change country', async ({ page }) => {
      await page.goto('/de-at');
      await dismissOutOfScopePopups(page);
      await openCountrySelector(page);

      // Change selection but do NOT confirm — close with X
      const dropdown = page.getByRole('combobox');
      await dropdown.selectOption('US');

      const closeBtn = page.getByRole('dialog').getByRole('button').first();
      await closeBtn.click();

      // Header should still show Austria/EUR
      await expect(page.locator('header').first()).toContainText(/AUT|€/);
      // URL should still be de-at
      await expect(page).toHaveURL(/\/de-at/);
    });
  });

  test.describe('TC-GROUP-07: Full End-to-End Currency Flows', () => {

    test('TC21 — Full EUR flow: select Austria → confirm → verify header and prices', async ({ page }) => {
      await page.goto('/de-at');
      await dismissOutOfScopePopups(page);
      await openCountrySelector(page);
      await selectCountryAndConfirm(page, 'AT');
      await dismissOutOfScopePopups(page);

      // Header EUR
      await expect(page.locator('header').first()).toContainText(/€/);

      // Navigate to products and check EUR price
      await page.goto('/de-at/categories/moebel');
      const price = page.locator('[class*="price"]').first();
      await expect(price).toContainText(/EUR|€/);
    });

    test('TC22 — Full USD flow: select United States → confirm → verify header and prices', async ({ page }) => {
      await page.goto('/de-at');
      await dismissOutOfScopePopups(page);
      await openCountrySelector(page);
      await selectCountryAndConfirm(page, 'US');
      await dismissOutOfScopePopups(page);

      // Header USD
      await expect(page.locator('header').first()).toContainText(/\$/);

      // Navigate to products and check USD price
      await page.goto('/categories/furniture');
      const price = page.locator('[class*="price"]').first();
      await expect(price).toContainText(/USD|\$/);
    });

    test('TC23 — Full GBP flow: select United Kingdom → confirm → verify header and prices', async ({ page }) => {
      await page.goto('/de-at');
      await dismissOutOfScopePopups(page);
      await openCountrySelector(page);
      await selectCountryAndConfirm(page, 'GB');

      // Header GBP
      await expect(page.locator('header').first()).toContainText(/£/);

      // Navigate to products and check GBP price
      await page.goto('/en-gb/categories/furniture');
      const price = page.locator('[class*="price"]').first();
      await expect(price).toContainText(/GBP|£/);
    });
  });

});
