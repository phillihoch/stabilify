import { expect, test } from "@playwright/test";
import { extendPage } from "../src";

test("getByTextStable example", async ({ page }) => {
  // Erweitere die Page mit Stabilify
  extendPage(page);

  // Navigiere zu einer Test-Seite
  await page.goto("https://example.com");

  // Verwende getByTextStable - findet ähnlichen Text automatisch
  const heading = page.getByTextStable("Example Domain");
  await expect(heading).toBeVisible();

  // Funktioniert auch wenn der Text leicht anders ist
  const moreInfo = page.getByTextStable("More information");
  await expect(moreInfo).toBeVisible();
});
