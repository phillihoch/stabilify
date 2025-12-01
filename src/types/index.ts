import type { Page } from "@playwright/test";

export interface HealingResult {
  success: boolean;
  originalSelector: string;
  healedSelector?: string;
  aiReasoning: string;
  domChanges: string;
  action: string;
  timestamp: Date;
  tokensUsed: number;
}

export interface StabilifyOptions {
  apiKey?: string;
  maxRetries?: number;
  logLevel?: "info" | "warn" | "debug";
}

export interface ExtendedPage extends Page {
  getByTextStable: Page["getByText"];
  getByRoleStable: Page["getByRole"];
}
