import type { Page } from "@playwright/test";
import type { HealingResult } from "../../types";
import { AIClient } from "../ai/client";
import { HealingReporter } from "./reporter";

export class HealingEngine {
  private readonly aiClient: AIClient;

  constructor(apiKey: string) {
    this.aiClient = new AIClient(apiKey);
  }

  async healLocator(
    page: Page,
    selector: string,
    action: string,
    selectorType: "text" | "role" = "text"
  ): Promise<HealingResult> {
    try {
      // Versuche zuerst den Original-Selektor zu finden
      const locator =
        selectorType === "text"
          ? page.getByText(selector, { exact: false })
          : page.getByRole(selector as any);
      await locator.waitFor({ timeout: 5000 });

      // Wenn erfolgreich, kein Healing nötig
      return {
        success: true,
        originalSelector: selector,
        aiReasoning: `Original ${selectorType} locator worked`,
        domChanges: "No changes needed",
        action: `${action} successful`,
        timestamp: new Date(),
        tokensUsed: 0,
      };
    } catch (error) {
      // Healing-Versuch
      const domSnapshot = await page.content();
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";

      const aiResult = await this.aiClient.improveSelectorAsync(
        selector,
        domSnapshot,
        errorMessage,
        selectorType
      );

      try {
        // Versuche den geheilten Selektor
        const healedLocator = page.locator(aiResult.healedSelector);
        await healedLocator.waitFor({ timeout: 5000 });

        const result: HealingResult = {
          success: true,
          originalSelector: selector,
          healedSelector: aiResult.healedSelector,
          aiReasoning: aiResult.reasoning,
          domChanges: aiResult.domChanges,
          action: `${action} successful after healing`,
          timestamp: new Date(),
          tokensUsed: 0, // Token tracking kann später hinzugefügt werden
        };

        console.log(HealingReporter.formatSuccess(result));
        return result;
      } catch {
        const result: HealingResult = {
          success: false,
          originalSelector: selector,
          healedSelector: aiResult.healedSelector,
          aiReasoning: aiResult.reasoning,
          domChanges: aiResult.domChanges,
          action: `${action} failed even after healing`,
          timestamp: new Date(),
          tokensUsed: 0, // Token tracking kann später hinzugefügt werden
        };

        console.warn(HealingReporter.formatFailure(result));
        throw error;
      }
    }
  }
}
