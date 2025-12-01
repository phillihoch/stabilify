import OpenAI from "openai";

/**
 * SelectorImprovementResult - Ergebnis der Selektor-Verbesserung
 */
export interface SelectorImprovementResult {
  healedSelector: string;
  reasoning: string;
  domChanges: string;
  confidence: number; // 0-1: Wie sicher ist der Agent, dass dieser Selektor funktioniert
}

/**
 * AIClient - Dedizierte Selektor-Verbesserung
 *
 * Verantwortung:
 * - Analysiert fehlgeschlagene Selektoren
 * - Schlägt verbesserte, stabilere Selektoren vor
 * - Bewertet die Qualität der Verbesserung mit einem Confidence Score
 *
 * Input: originalSelector, domSnapshot, errorMessage
 * Output: { healedSelector, reasoning, domChanges, confidence }
 */
export class AIClient {
  private readonly openai: OpenAI;
  private readonly model: string;

  constructor(apiKey: string, model: string = "gpt-4o-mini") {
    this.openai = new OpenAI({ apiKey });
    this.model = model;
  }

  async improveSelectorAsync(
    originalSelector: string,
    domSnapshot: string,
    errorMessage: string,
    selectorType: "text" | "role" = "text"
  ): Promise<SelectorImprovementResult> {
    const prompt = this.createPrompt(
      originalSelector,
      domSnapshot,
      errorMessage,
      selectorType
    );

    const schema = {
      type: "object",
      properties: {
        healedSelector: {
          type: "string",
          description: "Improved, more stable selector",
        },
        reasoning: {
          type: "string",
          description: "Explanation of why this selector is better",
        },
        domChanges: {
          type: "string",
          description: "Description of what changed in the DOM",
        },
        confidence: {
          type: "number",
          description:
            "Confidence score (0-1) indicating how likely this selector will work. Use 0 if no suitable selector can be found.",
          minimum: 0,
          maximum: 1,
        },
      },
      required: ["healedSelector", "reasoning", "domChanges", "confidence"],
    };

    const response = await this.openai.chat.completions.create({
      model: this.model,
      messages: [
        { role: "system", content: prompt.system },
        { role: "user", content: prompt.user },
      ],
      temperature: 1,
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "selector_improvement_result",
          description: "Selector improvement result",
          schema: schema,
        },
      },
    });

    const content = response.choices[0].message.content;
    if (!content) throw new Error("No response from AIClient");

    const result: SelectorImprovementResult = JSON.parse(content);

    console.log(`[AI CLIENT] Healed selector: ${result.healedSelector}`);
    console.log(`[AI CLIENT] Reasoning: ${result.reasoning}`);
    console.log(`[AI CLIENT] Confidence: ${result.confidence}`);

    return result;
  }

  private createPrompt(
    originalSelector: string,
    domSnapshot: string,
    errorMessage: string,
    selectorType: "text" | "role" = "text"
  ) {
    const selectorTypeDescription =
      selectorType === "text"
        ? "text-based selector (getByText)"
        : "role-based selector (getByRole)";

    const selectorTypeGuidance =
      selectorType === "text"
        ? `The original selector was looking for text content: "${originalSelector}"
Consider suggesting:
- Alternative text that might be present
- A CSS selector targeting the element with that text
- A role-based selector if the element has a semantic role
- A data-testid or aria-label selector`
        : `The original selector was looking for role: "${originalSelector}"
Consider suggesting:
- Alternative role that might match the element
- A CSS selector targeting the element
- A text-based selector if the element has visible text
- A data-testid or aria-label selector`;

    return {
      system: `You are an expert in web testing and DOM analysis.

Given a failed ${selectorTypeDescription} and the current DOM state, suggest a better, more stable selector.

Rules:
1. Analyze why the original selector failed
2. Identify what changed in the DOM
3. Suggest a MORE STABLE selector that is less likely to break
4. Prefer data-testid, aria-labels, or semantic selectors over fragile CSS selectors
5. STRICT MATCHING: The new selector MUST target the intended element
6. If NO suitable selector can be found, still return a suggestion but set confidence to 0
7. The healed selector should be a valid Playwright selector (CSS, text=, role=, data-testid=, etc.)

Confidence Scoring:
- 1.0: Perfect match (highly stable selector found, e.g., data-testid)
- 0.8-0.9: Good match (stable selector found, e.g., aria-label, role)
- 0.5-0.7: Partial match (selector works but may be fragile)
- 0.1-0.4: Poor match (selector might work but is very fragile)
- 0.0: NO suitable selector found (element doesn't exist or can't be reliably targeted)

IMPORTANT: If the element no longer exists in the DOM or cannot be reliably targeted,
you MUST set confidence to 0.0 and explain in the reasoning why no suitable selector was found.`,
      user: `Original ${selectorTypeDescription}: ${originalSelector}
Error: ${errorMessage}

${selectorTypeGuidance}

<dom_snapshot>
${domSnapshot}
</dom_snapshot>

Analyze the failure and suggest an improved selector.`,
    };
  }
}
