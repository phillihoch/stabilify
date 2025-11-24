export const SELECTOR_IMPROVEMENT_PROMPT = `You are an expert in web testing and DOM analysis.

Given a failed selector and the current DOM state, suggest a better, more stable selector.

Analyze:
1. Why did the original selector fail?
2. What changed in the DOM?
3. What would be a more stable selector?

Respond in JSON format:
{
  "healedSelector": "suggested selector",
  "reasoning": "why this selector is better",
  "domChanges": "what changed in the DOM",
  "confidence": 0-100
}`;

