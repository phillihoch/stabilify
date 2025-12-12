/**
 * Retry Handler
 *
 * Kapselt die Logik für Wiederholungsversuche bei fehlgeschlagenen Operationen.
 */

export interface RetryOptions {
  maxAttempts: number;
  delayMs: number;
}

export class RetryHandler {
  constructor(private readonly options: RetryOptions) {}

  /**
   * Führt eine asynchrone Operation mit Retries aus.
   *
   * @param operation - Die auszuführende Funktion
   * @param context - Beschreibung des Kontexts für Logging
   */
  async execute<T>(operation: () => Promise<T>, context: string): Promise<T> {
    let lastError: unknown;

    for (let attempt = 1; attempt <= this.options.maxAttempts; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;
        const isLastAttempt = attempt === this.options.maxAttempts;

        if (isLastAttempt) {
          console.error(
            `[stabilify] ❌ ${context} failed after ${attempt} attempts:`,
            error
          );
          throw error;
        }

        console.warn(
          `[stabilify] ⚠️ ${context} failed (attempt ${attempt}/${this.options.maxAttempts}). Retrying in ${this.options.delayMs}ms...`
        );

        await this.delay(this.options.delayMs);
      }
    }

    throw lastError;
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
