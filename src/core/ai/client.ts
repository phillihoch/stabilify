import OpenAI from 'openai';
import { SELECTOR_IMPROVEMENT_PROMPT } from './prompts';

export class AIClient {
  private client: OpenAI;

  constructor(apiKey: string) {
    this.client = new OpenAI({ apiKey });
  }

  async improveSelectorAsync(
    originalSelector: string,
    domSnapshot: string,
    errorMessage: string
  ): Promise<{
    healedSelector: string;
    reasoning: string;
    domChanges: string;
    tokensUsed: number;
  }> {
    const response = await this.client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: SELECTOR_IMPROVEMENT_PROMPT },
        {
          role: 'user',
          content: `Original selector: ${originalSelector}\nError: ${errorMessage}\nDOM:\n${domSnapshot}`,
        },
      ],
      response_format: { type: 'json_object' },
    });

    const result = JSON.parse(response.choices[0].message.content || '{}');
    const tokensUsed = response.usage?.total_tokens || 0;

    return {
      healedSelector: result.healedSelector || '',
      reasoning: result.reasoning || '',
      domChanges: result.domChanges || '',
      tokensUsed,
    };
  }
}

