import type { Page } from '@playwright/test';
import type { HealingResult } from '../../types';
import { AIClient } from '../ai/client';
import { HealingReporter } from './reporter';

export class HealingEngine {
  private aiClient: AIClient;

  constructor(apiKey: string) {
    this.aiClient = new AIClient(apiKey);
  }

  async healClick(page: Page, selector: string): Promise<HealingResult> {
    try {
      // Versuche zuerst den Original-Selektor
      await page.click(selector, { timeout: 5000 });
      
      // Wenn erfolgreich, kein Healing nötig
      return {
        success: true,
        originalSelector: selector,
        aiReasoning: 'Original selector worked',
        domChanges: 'No changes needed',
        action: 'Click successful',
        timestamp: new Date(),
        tokensUsed: 0,
      };
    } catch (error) {
      // Healing-Versuch
      const domSnapshot = await page.content();
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      const aiResult = await this.aiClient.improveSelectorAsync(
        selector,
        domSnapshot,
        errorMessage
      );

      try {
        // Versuche den geheilten Selektor
        await page.click(aiResult.healedSelector, { timeout: 5000 });

        const result: HealingResult = {
          success: true,
          originalSelector: selector,
          healedSelector: aiResult.healedSelector,
          aiReasoning: aiResult.reasoning,
          domChanges: aiResult.domChanges,
          action: 'Click successful after healing',
          timestamp: new Date(),
          tokensUsed: aiResult.tokensUsed,
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
          action: 'Click failed even after healing',
          timestamp: new Date(),
          tokensUsed: aiResult.tokensUsed,
        };

        console.warn(HealingReporter.formatFailure(result));
        throw error;
      }
    }
  }

  async healFill(
    page: Page,
    selector: string,
    value: string
  ): Promise<HealingResult> {
    try {
      await page.fill(selector, value, { timeout: 5000 });
      
      return {
        success: true,
        originalSelector: selector,
        aiReasoning: 'Original selector worked',
        domChanges: 'No changes needed',
        action: `Fill with "${value}" successful`,
        timestamp: new Date(),
        tokensUsed: 0,
      };
    } catch (error) {
      const domSnapshot = await page.content();
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      const aiResult = await this.aiClient.improveSelectorAsync(
        selector,
        domSnapshot,
        errorMessage
      );

      try {
        await page.fill(aiResult.healedSelector, value, { timeout: 5000 });

        const result: HealingResult = {
          success: true,
          originalSelector: selector,
          healedSelector: aiResult.healedSelector,
          aiReasoning: aiResult.reasoning,
          domChanges: aiResult.domChanges,
          action: `Fill with "${value}" successful after healing`,
          timestamp: new Date(),
          tokensUsed: aiResult.tokensUsed,
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
          action: `Fill with "${value}" failed even after healing`,
          timestamp: new Date(),
          tokensUsed: aiResult.tokensUsed,
        };

        console.warn(HealingReporter.formatFailure(result));
        throw error;
      }
    }
  }
}

