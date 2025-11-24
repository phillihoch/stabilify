import type { HealingResult } from '../../types';

export class HealingReporter {
  static formatSuccess(result: HealingResult): string {
    return `
🔧 Auto-Healing erfolgreich
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Original Selector: ${result.originalSelector}
Neuer Selector:    ${result.healedSelector}

Was hat sich geändert?
${result.domChanges}

Ausgeführte Aktion:
${result.action}

AI-Empfehlung:
${result.aiReasoning}

Kosten: ${(result.tokensUsed / 1000).toFixed(1)}k Tokens (~$${(result.tokensUsed * 0.000002).toFixed(3)})
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    `.trim();
  }

  static formatFailure(result: HealingResult): string {
    return `
❌ Auto-Healing fehlgeschlagen
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Original Selector: ${result.originalSelector}

Was hat sich geändert?
${result.domChanges}

AI-Analyse:
${result.aiReasoning}

Kosten: ${(result.tokensUsed / 1000).toFixed(1)}k Tokens (~$${(result.tokensUsed * 0.000002).toFixed(3)})
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    `.trim();
  }
}

