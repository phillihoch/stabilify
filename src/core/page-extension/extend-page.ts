import type { Page } from '@playwright/test';
import type { ExtendedPage, StabilifyOptions } from '../../types';
import { HealingEngine } from '../healing/engine';
import * as dotenv from 'dotenv';

dotenv.config();

export function extendPage(
  page: Page,
  options?: StabilifyOptions
): ExtendedPage {
  const apiKey = options?.apiKey || process.env.OPENAI_API_KEY;
  
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY is required. Set it in .env or pass via options.');
  }

  const engine = new HealingEngine(apiKey);
  const extendedPage = page as ExtendedPage;

  extendedPage.clickStable = async (selector: string) => {
    await engine.healClick(page, selector);
  };

  extendedPage.fillStable = async (selector: string, value: string) => {
    await engine.healFill(page, selector, value);
  };

  return extendedPage;
}

