import { describe, it, expect } from 'vitest';
import { HealingReporter } from '../../src/core/healing/reporter';
import type { HealingResult } from '../../src/types';

describe('HealingReporter', () => {
  it('should format success message', () => {
    const result: HealingResult = {
      success: true,
      originalSelector: 'button.old',
      healedSelector: 'button[data-testid="submit"]',
      aiReasoning: 'Use data-testid for stability',
      domChanges: 'CSS class changed',
      action: 'Click successful',
      timestamp: new Date(),
      tokensUsed: 1200,
    };

    const message = HealingReporter.formatSuccess(result);
    
    expect(message).toContain('Auto-Healing erfolgreich');
    expect(message).toContain('button.old');
    expect(message).toContain('button[data-testid="submit"]');
  });

  it('should format failure message', () => {
    const result: HealingResult = {
      success: false,
      originalSelector: 'form#login',
      aiReasoning: 'Element not found',
      domChanges: 'Form structure changed',
      action: 'Click failed',
      timestamp: new Date(),
      tokensUsed: 2100,
    };

    const message = HealingReporter.formatFailure(result);
    
    expect(message).toContain('Auto-Healing fehlgeschlagen');
    expect(message).toContain('form#login');
  });
});

