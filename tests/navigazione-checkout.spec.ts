import { test, expect } from '@playwright/test';

test('navigazione categorie e avvio checkout', async ({ page }) => {
  // Naviga direttamente alla categoria Tavoli
  await page.goto('/it-it/categories/arredo/tavoli');
  // Apre il prodotto
  await page.getByRole('link', { name: 'Organizza le Liste Specchio' }).click();
  // Aggiunge al carrello e aumenta la quantità
  await page.getByRole('button', { name: 'Aggiungi al carrello' }).click();
  await page.getByRole('button', { name: '+' }).click();
  await page.getByRole('button', { name: 'Chiudi' }).click();
  // Avvia il checkout
  await page.getByRole('link', { name: "Procedi con l'ordine" }).click();
  await page.getByRole('button', { name: "Procedi con l'ordine" }).click();
  // Verifica che la pagina di checkout sia caricata
  await expect(page.getByRole('textbox', { name: 'Email' })).toBeVisible();
});