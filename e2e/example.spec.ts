/**
 * Beispiel E2E-Test zur Demonstration des Self-Healing-Reporters
 *
 * Dieser Test zeigt, wie der Reporter in echten Playwright-Tests funktioniert.
 */

import { test, expect } from "@playwright/test";

test.describe("Beispiel Tests", () => {
  test("sollte erfolgreich durchlaufen", async ({ page }) => {
    // Beispiel: Gehe zu einer Seite
    await page.goto("https://playwright.dev/");

    // Prüfe den Titel
    await expect(page).toHaveTitle(/Playwright/);
  });

  // Dieser Test kann zum Testen des Reporters aktiviert werden
  test.skip("sollte fehlschlagen und vom Reporter erfasst werden", async ({
    page,
  }) => {
    await page.goto("https://playwright.dev/");

    // Absichtlich fehlschlagender Test
    await expect(page).toHaveTitle(/Dieser Titel existiert nicht/);
  });
});

