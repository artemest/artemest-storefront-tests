# Artemest Storefront Tests
Test E2E con Playwright per il sito Artemest.

## Struttura

```
tests/                  → file di test (.spec.ts)
playwright.config.ts    → configurazione Playwright
.github/workflows/      → GitHub Actions
```

## Eseguire i test via GitHub Actions
1. Vai su Actions → Playwright Tests → Run workflow
2. Scegli l'ambiente (produzione o staging)
3. Inserisci il nome del test (opzionale, lascia vuoto per eseguirli tutti)
4. Clicca Run workflow