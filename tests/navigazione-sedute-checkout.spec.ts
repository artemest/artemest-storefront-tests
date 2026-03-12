import { test, expect } from "@playwright/test";

test("navigazione sedute e checkout", async ({ page }) => {
  // Naviga alla home page italiana
  await page.goto("/it-it");

  // Accetta i cookie essenziali
  await page.getByRole("button", { name: "COOKIE ESSENZIALI" }).click();

  // Clicca sulla categoria Sedute
  await page.getByRole("link", { name: "Sedute" }).click();

  // Clicca sul primo prodotto della griglia
  await page.locator('[data-testid="product-card"]').first().click();

  // Aggiunge il prodotto al carrello
  await page.getByRole("button", { name: "Aggiungi al carrello" }).click();

  // Procedi con l'ordine dal mini carrello
  await page.getByRole("link", { name: "Procedi con l'ordine" }).click();

  // Procedi con l'ordine dalla pagina carrello
  await page.getByRole("button", { name: "Procedi con l'ordine" }).click();

  // Verifica che la pagina di checkout sia caricata
  await expect(page.getByRole("textbox", { name: "Email" })).toBeVisible();
});
