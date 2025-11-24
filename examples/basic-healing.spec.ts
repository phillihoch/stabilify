import { test } from '@playwright/test';
import { extendPage } from '../src';

test('basic healing example', async ({ page }) => {
  // Erweitere die Page mit Stabilify
  extendPage(page);

  // Navigiere zu einer Test-Seite
  await page.goto('https://example.com');

  // Verwende stable Methoden - diese heilen automatisch bei Fehlern
  await page.clickStable('button.submit');
  await page.fillStable('#email', 'test@example.com');
});

