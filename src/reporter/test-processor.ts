/**
 * Test Processor
 *
 * Verarbeitet Playwright Test-Ergebnisse und wandelt sie in das Stabilify/CTRF Format um.
 */

import type { Suite, TestCase, TestResult } from "@playwright/test/reporter";
import * as fs from "node:fs";
import type { CtrfStep, CtrfTestAttempt, CtrfTestState } from "../types/ctrf";
import type {
  StabilifyTest,
  StabilifyTestExtra,
} from "../types/stabilify-report";

export class TestProcessor {
  /**
   * Verarbeitet einen einzelnen Testfall.
   */
  processTest(test: TestCase, result: TestResult): StabilifyTest {
    // Suite-Pfad aufbauen
    const suitePath = this.buildSuitePath(test);

    // Browser-Info extrahieren
    const browserInfo = this.extractBrowserInfo(result);

    // Status mappen
    const status = this.mapStatus(result.status);

    // Flaky-Detection
    const isFlaky = result.status === "passed" && result.retry > 0;

    // Steps verarbeiten
    const steps = this.processSteps(result.steps);

    // Retry-Attempts sammeln
    const retryAttempts = this.collectRetryAttempts(test);

    // Stabilify-spezifische Extras
    const extra = this.buildExtra(test, result);

    // Attachments verarbeiten
    const attachments = result.attachments.map((a) => ({
      name: a.name,
      contentType: a.contentType,
      path: a.path || "[embedded]",
    }));

    return {
      name: test.title,
      status: status,
      duration: result.duration,
      start: result.startTime.getTime(),
      stop: result.startTime.getTime() + result.duration,
      suite: suitePath,
      message: result.errors.map((e) => e.message).join("\n"),
      trace: result.errors.map((e) => e.stack).join("\n"),
      snippet: result.errors.map((e) => e.snippet).join("\n"),
      rawStatus: result.status,
      type: "e2e",
      filePath: test.location.file,
      retries: result.retry,
      flaky: isFlaky,
      browser: browserInfo,
      steps: steps,
      stdout: result.stdout.map(String),
      stderr: result.stderr.map(String),
      attachments: attachments,
      retryAttempts: retryAttempts.length > 0 ? retryAttempts : undefined,
      extra: extra,
    };
  }

  /**
   * Baut die Stabilify-spezifischen Extras auf.
   */
  private buildExtra(test: TestCase, result: TestResult): StabilifyTestExtra {
    const extra: StabilifyTestExtra = {
      testId: test.id,
      projectName: test.titlePath()[1] || "default",
      location: {
        line: test.location.line,
        column: test.location.column,
      },
    };

    // Nur bei Failures zusätzliche Details sammeln
    if (result.status === "failed" || result.status === "timedOut") {
      // Error Context extrahieren
      const errorContextAttachment = result.attachments.find(
        (a) => a.name === "error-context"
      );
      if (errorContextAttachment) {
        extra.errorContext = this.extractErrorContext(errorContextAttachment);
      }

      // Detaillierte Fehler
      extra.errors = result.errors.map((e) => ({
        message: e.message || "Unknown error",
        stack: e.stack,
        snippet: e.snippet,
        location: e.location
          ? {
              file: e.location.file,
              line: e.location.line,
              column: e.location.column,
            }
          : undefined,
      }));
    }

    return extra;
  }

  /**
   * Mapped Playwright Status zu CTRF Status.
   */
  private mapStatus(status: TestResult["status"]): CtrfTestState {
    switch (status) {
      case "passed":
        return "passed";
      case "failed":
      case "timedOut":
        return "failed";
      case "skipped":
        return "skipped";
      case "interrupted":
        return "other";
      default:
        return "other";
    }
  }

  /**
   * Baut den Suite-Pfad aus der Test-Hierarchie auf.
   */
  private buildSuitePath(test: TestCase): string {
    const pathComponents: string[] = [];
    let currentSuite: Suite | undefined = test.parent;

    while (currentSuite !== undefined) {
      if (currentSuite.title !== "") {
        pathComponents.unshift(currentSuite.title);
      }
      currentSuite = currentSuite.parent;
    }

    return pathComponents.join(" > ");
  }

  /**
   * Extrahiert Browser-Informationen aus dem metadata.json Attachment.
   */
  private extractBrowserInfo(result: TestResult): string | undefined {
    const metadataAttachment = result.attachments.find(
      (attachment) => attachment.name === "metadata.json"
    );

    if (metadataAttachment?.body) {
      try {
        const metadataRaw = metadataAttachment.body.toString("utf-8");
        const metadata = JSON.parse(metadataRaw);
        if (metadata?.name || metadata?.version) {
          return `${metadata.name || ""} ${metadata.version || ""}`.trim();
        }
      } catch {
        // Ignorieren falls Parsing fehlschlägt
      }
    }

    return undefined;
  }

  /**
   * Verarbeitet Steps rekursiv.
   */
  private processSteps(steps: TestResult["steps"]): CtrfStep[] {
    const result: CtrfStep[] = [];

    for (const step of steps) {
      // Nur test.step Kategorien verarbeiten
      if (step.category === "test.step") {
        const stepStatus: CtrfTestState =
          step.error === undefined ? "passed" : "failed";

        result.push({
          name: step.title,
          status: stepStatus,
        });
      }

      // Rekursiv Child-Steps verarbeiten
      if (step.steps && step.steps.length > 0) {
        result.push(...this.processSteps(step.steps));
      }
    }

    return result;
  }

  /**
   * Sammelt Details aller vorherigen fehlgeschlagenen Retry-Versuche.
   */
  private collectRetryAttempts(test: TestCase): CtrfTestAttempt[] {
    // Nur vorherige Versuche (alle außer dem letzten)
    if (test.results.length <= 1) {
      return [];
    }

    const previousResults = test.results.slice(0, -1);
    const failedStatuses = new Set(["failed", "timedOut"]);

    return previousResults
      .filter((result) => failedStatuses.has(result.status))
      .map((prevResult) => {
        const error = prevResult.errors[0];
        return {
          status: "failed",
          duration: prevResult.duration,
          message: error ? error.message : undefined,
          trace: error ? error.stack : undefined,
          snippet: error ? error.snippet : undefined,
        };
      });
  }

  /**
   * Extrahiert Error-Context von Playwright (Page Snapshot).
   */
  private extractErrorContext(attachment: {
    name: string;
    contentType: string;
    path?: string;
    body?: Buffer;
  }): StabilifyTestExtra["errorContext"] {
    const errorContextPath = attachment.path;

    if (!errorContextPath) {
      // Falls nur embedded Body vorhanden
      if (attachment.body) {
        return {
          storagePath: undefined,
          content: attachment.body.toString("utf-8"),
        };
      }
      return undefined;
    }

    // Versuche den Inhalt zu lesen (wenn < 10KB)
    try {
      if (fs.existsSync(errorContextPath)) {
        const stats = fs.statSync(errorContextPath);
        // Nur lesen wenn kleiner als 10KB
        if (stats.size < 10 * 1024) {
          const content = fs.readFileSync(errorContextPath, "utf-8");
          return {
            storagePath: errorContextPath,
            content: content,
          };
        } else {
          return {
            storagePath: errorContextPath,
            content: undefined, // Zu groß für Inline
          };
        }
      }
    } catch (error) {
      console.warn(
        `[stabilify] Konnte error-context nicht lesen: ${errorContextPath}`,
        error
      );
    }

    return {
      storagePath: errorContextPath,
      content: undefined,
    };
  }
}
