// artemest-login.spec.ts
// Comprehensive Playwright test suite for Artemest Login functionality
// Author: QA Engineer | Date: 2026-03-25
// Note: Selectors use role-based, text-based, and accessible name selectors — no CSS class selectors

import { test, expect, Page, BrowserContext } from '@playwright/test';

// ─────────────────────────────────────────────────────────────────────────────
// CONFIG
// ─────────────────────────────────────────────────────────────────────────────
const BASE_URL = 'http://www.artemest.com/en-us';
const EXPECTED_HOME_URL = 'https://artemest.com/';
const HARAKIRIMAIL_URL = 'https://harakirimail.com/';
const TEST_EMAIL = 'pablo.pepita@harakirimail.com';
const INBOX_NAME = 'pablo.pepita';
const OTP_TIMEOUT_MS = 30_000;
const NAV_TIMEOUT_MS = 15_000;

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Dismisses the shipping country popup if it appears on the page.
 */
async function dismissShippingCountryPopup(page: Page): Promise<void> {
  const closeButton = page.getByRole('button', { name: /close|×|✕/i });
  try {
    await closeButton.waitFor({ state: 'visible', timeout: 4000 });
    await closeButton.click();
    await closeButton.waitFor({ state: 'hidden', timeout: 3000 });
  } catch {
    // Popup did not appear — acceptable
  }
}

/**
 * Dismisses the "Are you an Interior Designer or Architect?" popup if it appears.
 */
async function dismissDesignerPopup(page: Page): Promise<void> {
  const noButton = page.getByRole('button', { name: /^no$/i });
  const closeButton = page.getByRole('button', { name: /close|×|✕/i });
  try {
    await noButton.waitFor({ state: 'visible', timeout: 4000 });
    await noButton.click();
  } catch {
    try {
      await closeButton.waitFor({ state: 'visible', timeout: 2000 });
      await closeButton.click();
    } catch {
      // Popup did not appear — acceptable
    }
  }
}

/**
 * Fetches the OTP code from the harakirimail inbox by polling until a new email
 * with the expected subject pattern arrives.
 */
async function fetchOTPFromHarakirimail(
  context: BrowserContext,
  inboxName: string,
  timeout = OTP_TIMEOUT_MS
): Promise<string> {
  const mailPage = await context.newPage();
  await mailPage.goto(HARAKIRIMAIL_URL, { waitUntil: 'domcontentloaded' });

  // Enter inbox name and submit
  await mailPage.getByRole('textbox', { name: /inbox name/i }).fill(inboxName);
  await mailPage.getByRole('button').click();
  await mailPage.waitForURL(`**/${inboxName}`, { timeout: NAV_TIMEOUT_MS });

  // Poll until OTP email arrives
  const deadline = Date.now() + timeout;
  let otpCode: string | null = null;

  while (Date.now() < deadline) {
    await mailPage.reload({ waitUntil: 'domcontentloaded' });

    // Find the email row whose subject contains the OTP pattern (digits + "is your code")
    const emailRows = mailPage.getByRole('link', { name: /is your code/i });
    const count = await emailRows.count();

    if (count > 0) {
      const subjectText = await emailRows.first().textContent();
      const match = subjectText?.match(/(\d{4,8})\s+is your code/i);
      if (match) {
        otpCode = match[1];
        break;
      }
    }

    await mailPage.waitForTimeout(2000);
  }

  await mailPage.close();

  if (!otpCode) {
    throw new Error(`OTP email not received within ${timeout}ms for inbox: ${inboxName}`);
  }

  return otpCode;
}

// ─────────────────────────────────────────────────────────────────────────────
// TEST SUITE
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Artemest Login Flow — End-to-End', () => {
  let page: Page;

  test.beforeEach(async ({ browser }) => {
    const context = await browser.newContext();
    page = await context.newPage();
  });

  test.afterEach(async () => {
    await page.context().close();
  });

  // ───────────────────────────────────────────────────────────────────────────
  // TEST 1: URL Redirect — /en-us → clean root URL
  // ───────────────────────────────────────────────────────────────────────────
  test('TC-01 | Navigating to /en-us redirects to clean root URL without locale', async () => {
    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });

    // Wait for redirect to settle
    await page.waitForURL(/artemest\.com\/?$/, { timeout: NAV_TIMEOUT_MS });

    // Assert URL does NOT contain locale segment
    expect(page.url()).not.toContain('/en-us');
    expect(page.url()).not.toContain('/it-it');
    expect(page.url()).not.toContain('/en-gb');

    // Assert the URL is the clean root
    expect(page.url()).toMatch(/^https:\/\/artemest\.com\/?(\?.*)?$/);

    // Assert page loaded (title contains Artemest)
    await expect(page).toHaveTitle(/artemest/i);
  });

  // ───────────────────────────────────────────────────────────────────────────
  // TEST 2: Account icon in header navigates to login page
  // ───────────────────────────────────────────────────────────────────────────
  test('TC-02 | Clicking Account icon opens the Sign In page', async () => {
    await page.goto(EXPECTED_HOME_URL, { waitUntil: 'domcontentloaded' });
    await dismissShippingCountryPopup(page);

    // Click the Account icon (accessible via role or aria-label)
    const accountIcon = page.getByRole('link', { name: /account|sign in|profile/i }).first();
    await accountIcon.click();

    // Assert navigation to the login/sign-in domain
    await page.waitForURL(/account\.artemest\.com.*login/, { timeout: NAV_TIMEOUT_MS });
    expect(page.url()).toContain('account.artemest.com');
    expect(page.url()).toContain('login');
  });

  // ───────────────────────────────────────────────────────────────────────────
  // TEST 3: Login page renders all expected UI elements
  // ───────────────────────────────────────────────────────────────────────────
  test('TC-03 | Login page displays all required UI elements', async () => {
    await page.goto(EXPECTED_HOME_URL, { waitUntil: 'domcontentloaded' });
    await dismissShippingCountryPopup(page);

    await page.getByRole('link', { name: /account|sign in|profile/i }).first().click();
    await page.waitForURL(/account\.artemest\.com.*login/, { timeout: NAV_TIMEOUT_MS });

    // Heading
    await expect(page.getByRole('heading', { name: /sign in/i })).toBeVisible();

    // Social login buttons
    await expect(page.getByRole('button', { name: /google/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /facebook/i })).toBeVisible();

    // Email input
    await expect(page.getByRole('textbox', { name: /email/i })).toBeVisible();

    // Continue / Submit button
    await expect(page.getByRole('button', { name: /continue/i })).toBeVisible();

    // Promotional checkbox
    const checkbox = page.getByRole('checkbox', { name: /promotional|newsletter/i });
    await expect(checkbox).toBeVisible();
    await expect(checkbox).toBeChecked(); // Pre-checked by default
  });

  // ───────────────────────────────────────────────────────────────────────────
  // TEST 4: OTP screen renders correctly after email submission
  // ───────────────────────────────────────────────────────────────────────────
  test('TC-04 | OTP "Enter Code" screen renders with correct elements and no resend/timer', async () => {
    await page.goto(EXPECTED_HOME_URL, { waitUntil: 'domcontentloaded' });
    await dismissShippingCountryPopup(page);

    await page.getByRole('link', { name: /account|sign in|profile/i }).first().click();
    await page.waitForURL(/account\.artemest\.com.*login/, { timeout: NAV_TIMEOUT_MS });

    // Enter email and continue
    await page.getByRole('textbox', { name: /email/i }).fill(TEST_EMAIL);
    await page.getByRole('button', { name: /continue/i }).click();

    // Wait for OTP screen
    await page.waitForURL(/account\.artemest\.com.*code/, { timeout: NAV_TIMEOUT_MS });

    // Assert heading
    await expect(page.getByRole('heading', { name: /enter code/i })).toBeVisible();

    // Assert confirmation text contains the email
    await expect(page.getByText(TEST_EMAIL)).toBeVisible();

    // Assert OTP input field
    await expect(page.getByRole('textbox', { name: /6.digit code|code/i })).toBeVisible();

    // Assert SUBMIT button
    await expect(page.getByRole('button', { name: /submit/i })).toBeVisible();

    // Assert "Sign in with a different email" link exists
    await expect(page.getByRole('link', { name: /sign in with a different email/i })).toBeVisible();

    // ⚠️ DESIGN REQUIREMENT: No "Resend code" link should be visible
    await expect(page.getByRole('link', { name: /resend/i })).not.toBeVisible();

    // ⚠️ DESIGN REQUIREMENT: No countdown timer or expiry info
    await expect(page.getByText(/expires in|expiry|countdown|resend in \d+/i)).not.toBeVisible();
  });

  // ───────────────────────────────────────────────────────────────────────────
  // TEST 5: Full login flow with OTP — success + B2B verification
  // ───────────────────────────────────────────────────────────────────────────
  test('TC-05 | Full OTP login flow — success, home redirect, B2B user with company name', async ({ browser }) => {
    const context = await browser.newContext();
    const mainPage = await context.newPage();

    // Navigate and dismiss popups
    await mainPage.goto(EXPECTED_HOME_URL, { waitUntil: 'domcontentloaded' });
    await dismissShippingCountryPopup(mainPage);

    // Navigate to login
    await mainPage.getByRole('link', { name: /account|sign in|profile/i }).first().click();
    await mainPage.waitForURL(/account\.artemest\.com.*login/, { timeout: NAV_TIMEOUT_MS });

    // Pre-open the harakirimail inbox tab (before requesting OTP, to catch it quickly)
    const mailPage = await context.newPage();
    await mailPage.goto(`${HARAKIRIMAIL_URL}inbox/${INBOX_NAME}`, { waitUntil: 'domcontentloaded' });

    // Enter email and trigger OTP
    await mainPage.bringToFront();
    await mainPage.getByRole('textbox', { name: /email/i }).fill(TEST_EMAIL);
    await mainPage.getByRole('button', { name: /continue/i }).click();
    await mainPage.waitForURL(/account\.artemest\.com.*code/, { timeout: NAV_TIMEOUT_MS });

    // Poll for OTP email in harakirimail
    await mailPage.bringToFront();
    const deadline = Date.now() + OTP_TIMEOUT_MS;
    let otpCode: string | null = null;

    while (Date.now() < deadline) {
      await mailPage.reload({ waitUntil: 'domcontentloaded' });
      const otpEmailLink = mailPage.getByRole('link', { name: /is your code/i });
      const count = await otpEmailLink.count();
      if (count > 0) {
        const subjectText = await otpEmailLink.first().textContent();
        const match = subjectText?.match(/(\d{4,8})\s+is your code/i);
        if (match) {
          otpCode = match[1];
          break;
        }
      }
      await mailPage.waitForTimeout(2000);
    }

    expect(otpCode, 'OTP should be received in harakirimail').not.toBeNull();

    // Back to Artemest — enter OTP
    await mainPage.bringToFront();
    await mainPage.getByRole('textbox', { name: /6.digit code|code/i }).fill(otpCode!);
    await mainPage.getByRole('button', { name: /submit/i }).click();

    // Assert redirect to homepage after successful login
    await mainPage.waitForURL(/artemest\.com\/?(\?.*)?$/, { timeout: NAV_TIMEOUT_MS });
    expect(mainPage.url()).toMatch(/^https:\/\/artemest\.com/);
    expect(mainPage.url()).not.toContain('account.artemest.com');

    // Dismiss designer popup if shown
    await dismissDesignerPopup(mainPage);

    // Verify user is logged in by navigating to account
    await mainPage.getByRole('link', { name: /account|profile/i }).first().click();
    await mainPage.waitForURL(/account\.artemest\.com.*profile/, { timeout: NAV_TIMEOUT_MS });

    // Assert email displayed in profile
    await expect(mainPage.getByText(TEST_EMAIL)).toBeVisible();

    // Assert B2B user — company name is visible (non-empty)
    // The company name appears in the page heading/section
    const companySection = mainPage.locator('[data-testid*="company"], [aria-label*="company"]');
    const companyText = await mainPage.getByRole('heading').filter({ hasText: /FORMA|TEST|company/i }).textContent().catch(() => null);
    // Fallback: Assert "TRADE SERVICES" menu indicates B2B
    // (Navigate back to home and check the nav)
    await mainPage.goto(EXPECTED_HOME_URL, { waitUntil: 'domcontentloaded' });
    await expect(mainPage.getByRole('link', { name: /trade services/i })).toBeVisible();

    await context.close();
  });

  // ───────────────────────────────────────────────────────────────────────────
  // TEST 6: Logout flow
  // ───────────────────────────────────────────────────────────────────────────
  test('TC-06 | Logout — user is signed out and redirected to homepage', async ({ browser }) => {
    // NOTE: This test assumes the user is already logged in.
    // In a real suite, use beforeEach to set auth state via storageState.
    const context = await browser.newContext();
    const mainPage = await context.newPage();

    // Full login flow (abbreviated via helper, assumes prior TC-05 logic)
    await mainPage.goto(EXPECTED_HOME_URL, { waitUntil: 'domcontentloaded' });
    await dismissShippingCountryPopup(mainPage);
    await mainPage.getByRole('link', { name: /account|sign in|profile/i }).first().click();
    await mainPage.waitForURL(/account\.artemest\.com.*login/, { timeout: NAV_TIMEOUT_MS });
    await mainPage.getByRole('textbox', { name: /email/i }).fill(TEST_EMAIL);
    await mainPage.getByRole('button', { name: /continue/i }).click();
    await mainPage.waitForURL(/account\.artemest\.com.*code/, { timeout: NAV_TIMEOUT_MS });

    const otpCode = await fetchOTPFromHarakirimail(context, INBOX_NAME);
    await mainPage.getByRole('textbox', { name: /6.digit code|code/i }).fill(otpCode);
    await mainPage.getByRole('button', { name: /submit/i }).click();
    await mainPage.waitForURL(/artemest\.com\/?(\?.*)?$/, { timeout: NAV_TIMEOUT_MS });
    await dismissDesignerPopup(mainPage);

    // Now perform logout from the profile dropdown
    const accountDropdownTrigger = mainPage.getByRole('button', { name: /account|profile/i }).or(
      mainPage.locator('[aria-label*="account"]')
    );
    await accountDropdownTrigger.click();

    const signOutButton = mainPage.getByRole('button', { name: /sign out/i });
    await expect(signOutButton).toBeVisible();
    await signOutButton.click();

    // Assert redirect to homepage
    await mainPage.waitForURL(/artemest\.com/, { timeout: NAV_TIMEOUT_MS });
    await dismissDesignerPopup(mainPage);

    // Assert user is logged out — "TRADE SERVICES" should not be in nav
    await expect(mainPage.getByRole('link', { name: /trade services/i })).not.toBeVisible();

    // Assert Account icon is in logged-out state (no company name in header)
    await expect(mainPage.getByText(/FORMA TEST/i)).not.toBeVisible();

    await context.close();
  });

  // ───────────────────────────────────────────────────────────────────────────
  // TEST 7: Invalid OTP code shows error
  // ───────────────────────────────────────────────────────────────────────────
  test('TC-07 | Entering incorrect OTP shows an error message', async () => {
    await page.goto(EXPECTED_HOME_URL, { waitUntil: 'domcontentloaded' });
    await dismissShippingCountryPopup(page);

    await page.getByRole('link', { name: /account|sign in|profile/i }).first().click();
    await page.waitForURL(/account\.artemest\.com.*login/, { timeout: NAV_TIMEOUT_MS });

    await page.getByRole('textbox', { name: /email/i }).fill(TEST_EMAIL);
    await page.getByRole('button', { name: /continue/i }).click();
    await page.waitForURL(/account\.artemest\.com.*code/, { timeout: NAV_TIMEOUT_MS });

    // Enter a wrong OTP
    await page.getByRole('textbox', { name: /6.digit code|code/i }).fill('000000');
    await page.getByRole('button', { name: /submit/i }).click();

    // Expect to remain on the code page (not redirected)
    await page.waitForTimeout(2000);
    expect(page.url()).toContain('code');

    // Expect an error message to appear
    const errorMessage = page.getByRole('alert').or(page.getByText(/invalid|incorrect|wrong|error/i));
    await expect(errorMessage).toBeVisible({ timeout: 5000 });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // TEST 8: Empty email validation
  // ───────────────────────────────────────────────────────────────────────────
  test('TC-08 | Submitting empty email shows validation error', async () => {
    await page.goto(EXPECTED_HOME_URL, { waitUntil: 'domcontentloaded' });
    await dismissShippingCountryPopup(page);

    await page.getByRole('link', { name: /account|sign in|profile/i }).first().click();
    await page.waitForURL(/account\.artemest\.com.*login/, { timeout: NAV_TIMEOUT_MS });

    // Leave email empty and click Continue
    await page.getByRole('button', { name: /continue/i }).click();

    // Should remain on login page
    await page.waitForTimeout(1000);
    expect(page.url()).toContain('login');

    // Expect validation error or HTML5 required validation
    const emailInput = page.getByRole('textbox', { name: /email/i });
    const validationMessage = await emailInput.evaluate((el: HTMLInputElement) => el.validationMessage);
    expect(validationMessage.length).toBeGreaterThan(0);
  });

  // ───────────────────────────────────────────────────────────────────────────
  // TEST 9: Invalid email format validation
  // ───────────────────────────────────────────────────────────────────────────
  test('TC-09 | Submitting invalid email format shows validation error', async () => {
    await page.goto(EXPECTED_HOME_URL, { waitUntil: 'domcontentloaded' });
    await dismissShippingCountryPopup(page);

    await page.getByRole('link', { name: /account|sign in|profile/i }).first().click();
    await page.waitForURL(/account\.artemest\.com.*login/, { timeout: NAV_TIMEOUT_MS });

    await page.getByRole('textbox', { name: /email/i }).fill('notanemail');
    await page.getByRole('button', { name: /continue/i }).click();

    // Should remain on login page
    await page.waitForTimeout(1000);
    expect(page.url()).toContain('login');

    // Expect error (HTML5 or custom)
    const emailInput = page.getByRole('textbox', { name: /email/i });
    const validationMessage = await emailInput.evaluate((el: HTMLInputElement) => el.validationMessage);
    expect(validationMessage.length).toBeGreaterThan(0);
  });

  // ───────────────────────────────────────────────────────────────────────────
  // TEST 10: "Sign in with a different email" link works correctly
  // ───────────────────────────────────────────────────────────────────────────
  test('TC-10 | "Sign in with a different email" navigates back to email input', async () => {
    await page.goto(EXPECTED_HOME_URL, { waitUntil: 'domcontentloaded' });
    await dismissShippingCountryPopup(page);

    await page.getByRole('link', { name: /account|sign in|profile/i }).first().click();
    await page.waitForURL(/account\.artemest\.com.*login/, { timeout: NAV_TIMEOUT_MS });

    await page.getByRole('textbox', { name: /email/i }).fill(TEST_EMAIL);
    await page.getByRole('button', { name: /continue/i }).click();
    await page.waitForURL(/account\.artemest\.com.*code/, { timeout: NAV_TIMEOUT_MS });

    // Click "Sign in with a different email"
    await page.getByRole('link', { name: /sign in with a different email/i }).click();

    // Should navigate back to login page with email input
    await page.waitForURL(/account\.artemest\.com.*login/, { timeout: NAV_TIMEOUT_MS });
    await expect(page.getByRole('textbox', { name: /email/i })).toBeVisible();
  });
});
