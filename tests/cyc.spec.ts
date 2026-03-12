import { test, expect } from "@playwright/test";

test("test", async ({ page }) => {
  await page.goto("/it-it");
  await page.getByRole("button", { name: "COOKIE ESSENZIALI" }).click();
  await expect(page.locator('[id="__next"]')).toContainText(
    "Spedizione:ITA (€)",
  );
  await page.getByRole("button", { name: "Lingua: ita" }).click();
  await expect(page.locator('[id="__next"]')).toMatchAriaSnapshot(`
    - text: Country
    - combobox:
      - option "🇦🇱 Albania (EUR)"
      - option "🇦🇺 Australia (USD)"
      - option "🇦🇹 Austria (EUR)"
      - option "🇧🇭 Bahrain (USD)"
      - option "🇧🇪 Belgium (EUR)"
      - option "🇧🇬 Bulgaria (EUR)"
      - option "🇨🇦 Canada (USD)"
      - option "🇨🇳 China (USD)"
      - option "🇭🇷 Croatia (EUR)"
      - option "🇨🇾 Cyprus (EUR)"
      - option "🇨🇿 Czech Republic (EUR)"
      - option "🇩🇰 Denmark (EUR)"
      - option "🇪🇪 Estonia (EUR)"
      - option "🇫🇮 Finland (EUR)"
      - option "🇫🇷 France (EUR)"
      - option "🇩🇪 Germany (EUR)"
      - option "🇬🇷 Greece (EUR)"
      - option "🇭🇰 Hong Kong (USD)"
      - option "🇭🇺 Hungary (EUR)"
      - option "🇮🇳 India (USD)"
      - option "🇮🇩 Indonesia (USD)"
      - option "🇮🇪 Ireland (EUR)"
      - option "🇮🇱 Israel (USD)"
      - option "🇮🇹 Italy (EUR)" [selected]
      - option "🇯🇵 Japan (USD)"
      - option "🇰🇼 Kuwait (USD)"
      - option "🇱🇻 Latvia (EUR)"
      - option "🇱🇧 Lebanon (USD)"
      - option "🇱🇹 Lithuania (EUR)"
      - option "🇱🇺 Luxembourg (EUR)"
      - option "🇲🇹 Malta (EUR)"
      - option "🇲🇽 Mexico (USD)"
      - option "🇲🇨 Monaco (EUR)"
      - option "🇲🇦 Morocco (USD)"
      - option "🇳🇱 Netherlands (EUR)"
      - option "🇳🇴 Norway (EUR)"
      - option "🇴🇲 Oman (USD)"
      - option "🇵🇱 Poland (EUR)"
      - option "🇵🇹 Portugal (EUR)"
      - option "🇶🇦 Qatar (USD)"
      - option "🇷🇴 Romania (EUR)"
      - option "🇸🇲 San Marino (EUR)"
      - option "🇸🇦 Saudi Arabia (USD)"
      - option "🇸🇬 Singapore (USD)"
      - option "🇸🇰 Slovakia (EUR)"
      - option "🇸🇮 Slovenia (EUR)"
      - option "🇿🇦 South Africa (USD)"
      - option "🇰🇷 South Korea (USD)"
      - option "🇪🇸 Spain (EUR)"
      - option "🇸🇪 Sweden (EUR)"
      - option "🇨🇭 Switzerland (EUR)"
      - option "🇹🇼 Taiwan (USD)"
      - option "🇹🇭 Thailand (USD)"
      - option "🇹🇷 Turkey (EUR)"
      - option "🇦🇪 United Arab Emirates (USD)"
      - option "🇬🇧 United Kingdom (GBP)"
      - option "🇺🇸 United States (USD)"
    - img
    - text: Language
    - radio "English"
    - text: English
    - radio "Italiano" [checked]
    - text: Italiano
    - button "Confirm"
    `);
  await expect(page.locator('[id="__next"]')).toContainText("English");
  await expect(page.locator('[id="__next"]')).toContainText("Italiano");
  await page.getByRole("combobox").selectOption("US");
  await page.getByRole("button", { name: "Confirm" }).click();
  await expect(page.getByRole("button", { name: "USA ($)" })).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Language: eng" }),
  ).toBeVisible();
});
