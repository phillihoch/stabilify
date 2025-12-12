/**
 * Summary Calculator
 *
 * Berechnet die Zusammenfassung (Summary) für den Test-Report.
 */

import type {
  StabilifyTest,
  StabilifyTestSummary,
} from "../types/stabilify-report";

export class SummaryCalculator {
  /**
   * Berechnet die Summary basierend auf den verarbeiteten Tests.
   *
   * @param tests - Liste der verarbeiteten Tests
   * @param startTime - Startzeitpunkt des Test-Runs (Unix Timestamp)
   * @param endTime - Endzeitpunkt des Test-Runs (Unix Timestamp)
   */
  calculate(
    tests: StabilifyTest[],
    startTime: number,
    endTime: number
  ): StabilifyTestSummary {
    const summary: StabilifyTestSummary = {
      tests: tests.length,
      passed: 0,
      failed: 0,
      skipped: 0,
      pending: 0,
      other: 0,
      suites: this.countSuites(tests),
      start: startTime,
      stop: endTime,
      extra: {
        flakyCount: 0,
        totalRetries: 0,
        durationMs: endTime - startTime,
      },
    };

    for (const test of tests) {
      // Status zählen
      switch (test.status) {
        case "passed":
          summary.passed++;
          break;
        case "failed":
          summary.failed++;
          break;
        case "skipped":
          summary.skipped++;
          break;
        case "pending":
          summary.pending++;
          break;
        default:
          summary.other++;
      }

      // Extras zählen
      if (test.flaky) {
        summary.extra.flakyCount++;
      }

      if (test.retries) {
        summary.extra.totalRetries += test.retries;
      }
    }

    return summary;
  }

  /**
   * Zählt die Anzahl der eindeutigen Suites.
   */
  private countSuites(tests: StabilifyTest[]): number {
    const suites = new Set<string>();
    for (const test of tests) {
      if (test.suite) {
        suites.add(test.suite);
      }
    }
    return suites.size;
  }
}
