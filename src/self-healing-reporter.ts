/**
 * Self-Healing Reporter für Playwright
 *
 * Ein Custom Playwright Reporter, der bei Testausführungen Fehler erkennt
 * und alle relevanten Informationen für die Weiterverarbeitung sammelt.
 *
 * @module self-healing-reporter
 */

import type {
  FullConfig,
  FullResult,
  Reporter,
  Suite,
  TestCase,
  TestResult,
} from "@playwright/test/reporter";
import * as fs from "node:fs";
import * as path from "node:path";

/**
 * Konfigurationsoptionen für den Self-Healing Reporter
 *
 * Unterstützt folgende Umgebungsvariablen (analog zum Playwright JSON Reporter):
 *
 * | Umgebungsvariable           | Config Option | Beschreibung                                                    |
 * |-----------------------------|---------------|-----------------------------------------------------------------|
 * | STABILIFY_OUTPUT_DIR        | -             | Verzeichnis für die Ausgabe. Ignoriert wenn OUTPUT_FILE gesetzt |
 * | STABILIFY_OUTPUT_NAME       | outputFile    | Basis-Dateiname, relativ zum Output-Verzeichnis                 |
 * | STABILIFY_OUTPUT_FILE       | outputFile    | Vollständiger Pfad. Überschreibt OUTPUT_DIR und OUTPUT_NAME     |
 */
export interface SelfHealingReporterOptions {
  /** Basis-Dateiname oder relativer Pfad für die Ausgabe. Kann auch über STABILIFY_OUTPUT_NAME gesetzt werden. */
  outputFile?: string;
  /** Verzeichnis der Playwright-Konfiguration (wird von Playwright automatisch gesetzt) */
  configDir?: string;
}

/**
 * Interface für die gesammelten Fehlerdaten eines fehlgeschlagenen Tests
 */
export interface CollectedFailure {
  /** Eindeutige Test-ID */
  testId: string;
  /** Vollständiger Titel-Pfad des Tests */
  title: string;
  /** Pfad zur Testdatei */
  file: string;
  /** Position im Quellcode */
  location: { line: number; column: number };
  /** Projektname */
  projectName: string;
  /** Gesammelte Fehlerinformationen */
  errors: Array<{
    message: string;
    stack?: string;
    snippet?: string;
    location?: { file: string; line: number; column: number };
  }>;
  /** Ausgeführte Test-Schritte */
  steps: Array<{
    title: string;
    duration: number;
    category: string;
    error?: string;
  }>;
  /** Pfade zu Screenshots */
  screenshots: string[];
  /** Pfade zu Trace-Dateien */
  traces: string[];
  /** Pfade zu Video-Dateien */
  videos: string[];
  /** Standardausgabe des Tests */
  stdout: string[];
  /** Fehlerausgabe des Tests */
  stderr: string[];
  /** Testdauer in Millisekunden */
  duration: number;
  /** Retry-Nummer */
  retry: number;
  /** Teststatus */
  status: string;
  /** Zeitstempel der Aufzeichnung */
  timestamp: string;
}

/**
 * Self-Healing Reporter Klasse
 *
 * Implementiert das Playwright Reporter-Interface und sammelt
 * Informationen über fehlgeschlagene Tests.
 */
class SelfHealingReporter implements Reporter {
  /** Gesammelte Fehlerdaten */
  private readonly failures: CollectedFailure[] = [];

  /** Reporter-Optionen */
  private readonly options: SelfHealingReporterOptions;

  /** Basis-Verzeichnis (configDir von Playwright) */
  private configDir: string = process.cwd();

  /**
   * Erstellt eine neue Reporter-Instanz.
   *
   * @param options - Konfigurationsoptionen
   */
  constructor(options: SelfHealingReporterOptions = {}) {
    this.options = options;
    if (options.configDir) {
      this.configDir = options.configDir;
    }
  }

  /**
   * Ermittelt den vollständigen Ausgabepfad basierend auf Umgebungsvariablen und Optionen.
   *
   * Priorität:
   * 1. STABILIFY_OUTPUT_FILE (vollständiger Pfad)
   * 2. outputFile Option + STABILIFY_OUTPUT_DIR
   * 3. STABILIFY_OUTPUT_NAME + STABILIFY_OUTPUT_DIR
   * 4. Default: configDir/self-healing-output/failures-{timestamp}.json
   */
  private resolveOutputPath(): string {
    // Höchste Priorität: Vollständiger Pfad aus Umgebungsvariable
    const envOutputFile = process.env.STABILIFY_OUTPUT_FILE;
    if (envOutputFile) {
      return path.isAbsolute(envOutputFile)
        ? envOutputFile
        : path.join(this.configDir, envOutputFile);
    }

    // Dateiname aus Option oder Umgebungsvariable
    const outputName =
      this.options.outputFile ??
      process.env.STABILIFY_OUTPUT_NAME ??
      `failures-${Date.now()}.json`;

    // Verzeichnis aus Umgebungsvariable oder Default
    const envOutputDir = process.env.STABILIFY_OUTPUT_DIR;
    let outputDir: string;

    if (envOutputDir) {
      outputDir = path.isAbsolute(envOutputDir)
        ? envOutputDir
        : path.join(this.configDir, envOutputDir);
    } else {
      outputDir = path.join(this.configDir, "self-healing-output");
    }

    return path.join(outputDir, outputName);
  }

  /**
   * Wird aufgerufen, wenn die Testsuite beginnt.
   *
   * @param _config - Playwright Konfiguration (nicht verwendet)
   * @param _suite - Root-Suite mit allen Tests (nicht verwendet)
   */
  onBegin(_config: FullConfig, _suite: Suite): void {
    // configDir ist bereits im Konstruktor gesetzt
  }

  /**
   * Wird nach jedem Test aufgerufen.
   * Sammelt Fehlerdaten bei nicht bestandenen Tests.
   *
   * @param test - Der ausgeführte Testfall
   * @param result - Das Testergebnis
   */
  onTestEnd(test: TestCase, result: TestResult): void {
    // Nur bei Fehlern sammeln
    if (result.status === "passed" || result.status === "skipped") {
      return;
    }

    this.collectFailureInfo(test, result);
  }

  /**
   * Wird am Ende der Testsuite aufgerufen.
   * Speichert alle gesammelten Fehlerdaten (auch wenn leer).
   *
   * @param _result - Das Gesamtergebnis der Testsuite (nicht verwendet)
   */
  async onEnd(_result: FullResult): Promise<void> {
    await this.writeReport();
  }

  /**
   * Gibt an, ob der Reporter in die Standardausgabe schreibt.
   * Gibt false zurück, um Konflikte mit anderen Reportern zu vermeiden.
   *
   * @returns false - schreibt nicht in stdio
   */
  printsToStdio(): boolean {
    return false;
  }

  /**
   * Sammelt alle relevanten Informationen eines fehlgeschlagenen Tests.
   *
   * @param test - Der fehlgeschlagene Testfall
   * @param result - Das Testergebnis mit Fehlerdetails
   */
  private collectFailureInfo(test: TestCase, result: TestResult): void {
    const failure: CollectedFailure = {
      testId: test.id,
      title: test.titlePath().join(" › "),
      file: test.location.file,
      location: { line: test.location.line, column: test.location.column },
      projectName: test.titlePath()[1] || "default",
      errors: result.errors.map((e) => ({
        message: e.message || "Unknown error",
        stack: e.stack,
        snippet: e.snippet,
        location: e.location,
      })),
      steps: result.steps.map((s) => ({
        title: s.title,
        duration: s.duration,
        category: s.category,
        error: s.error?.message,
      })),
      screenshots: [],
      traces: [],
      videos: [],
      stdout: result.stdout.map(String),
      stderr: result.stderr.map(String),
      duration: result.duration,
      retry: result.retry,
      status: result.status,
      timestamp: new Date().toISOString(),
    };

    // Attachments nach Typ kategorisieren
    for (const attachment of result.attachments) {
      if (attachment.contentType.startsWith("image/")) {
        failure.screenshots.push(attachment.path || "[embedded]");
      } else if (attachment.name === "trace") {
        failure.traces.push(attachment.path || "[embedded]");
      } else if (attachment.contentType.startsWith("video/")) {
        failure.videos.push(attachment.path || "[embedded]");
      }
    }

    this.failures.push(failure);
  }

  /**
   * Schreibt den Report (auch wenn keine Fehler vorliegen).
   */
  private async writeReport(): Promise<void> {
    const filePath = this.resolveOutputPath();

    // Stelle sicher, dass das Verzeichnis existiert
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    const report = {
      timestamp: new Date().toISOString(),
      totalFailures: this.failures.length,
      failures: this.failures,
    };

    fs.writeFileSync(filePath, JSON.stringify(report, null, 2));
  }

  /**
   * Getter für die gesammelten Fehler (für Tests)
   */
  getFailures(): CollectedFailure[] {
    return this.failures;
  }

  /**
   * Getter für den aufgelösten Output-Pfad (für Tests)
   */
  getOutputPath(): string {
    return this.resolveOutputPath();
  }
}

export default SelfHealingReporter;
export { SelfHealingReporter };
