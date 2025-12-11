/**
 * Self-Healing Reporter für Playwright
 *
 * Ein Custom Playwright Reporter, der bei Testausführungen Fehler erkennt
 * und alle relevanten Informationen für die Weiterverarbeitung sammelt.
 *
 * Basiert auf Best-Practices aus dem CTRF-Reporter mit Fokus auf KI-Fehleranalyse.
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
import { TestRunTracker } from "./utils/test-run-tracker";

/**
 * Environment-Informationen für den Report
 * Übernommen aus CTRF für besseren KI-Kontext
 */
export interface ReportEnvironment {
  /** Name der Applikation */
  appName?: string;
  /** Version der Applikation */
  appVersion?: string;
  /** Betriebssystem-Plattform */
  osPlatform?: string;
  /** Betriebssystem-Release */
  osRelease?: string;
  /** Betriebssystem-Version */
  osVersion?: string;
  /** Build-Name */
  buildName?: string;
  /** Build-Nummer */
  buildNumber?: string;
  /** Build-URL (z.B. CI-Link) */
  buildUrl?: string;
  /** Repository-Name */
  repositoryName?: string;
  /** Repository-URL */
  repositoryUrl?: string;
  /** Branch-Name */
  branchName?: string;
  /** Commit-Hash */
  commit?: string;
  /** Test-Umgebung (z.B. staging, production) */
  testEnvironment?: string;
}

/**
 * Upload-Konfiguration für den automatischen Upload von Failures an den Stabilify-Server
 */
export interface UploadOptions {
  /** Aktiviert/deaktiviert den Upload */
  enabled: boolean;
  /** API-Schlüssel für die Authentifizierung (kann aus Umgebungsvariable gelesen werden) */
  apiKey: string;
  /** Server-URL (Standard: https://api.stabilify.dev) */
  endpoint?: string;
  /** Anzahl der Wiederholungsversuche bei Fehlern (Standard: 3) */
  retryAttempts?: number;
  /** Verzögerung zwischen Wiederholungen in Millisekunden (Standard: 1000) */
  retryDelayMs?: number;
}

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
 * | STABILIFY_API_KEY           | upload.apiKey | API-Schlüssel für den Upload                                    |
 *
 * Environment-Informationen können entweder als verschachteltes Objekt oder flach übergeben werden:
 *
 * @example
 * // Verschachtelt:
 * ["stabilify/reporter", { environment: { appName: "MyApp", appVersion: "1.0.0" } }]
 *
 * // Flach (einfacher):
 * ["stabilify/reporter", { appName: "MyApp", appVersion: "1.0.0" }]
 *
 * @example
 * // Mit Upload-Konfiguration:
 * ["stabilify/reporter", {
 *   upload: {
 *     enabled: true,
 *     apiKey: process.env.STABILIFY_API_KEY,
 *     endpoint: "https://api.stabilify.dev",
 *     retryAttempts: 3,
 *     retryDelayMs: 1000
 *   }
 * }]
 */
export interface SelfHealingReporterOptions extends Partial<ReportEnvironment> {
  /** Basis-Dateiname oder relativer Pfad für die Ausgabe. Kann auch über STABILIFY_OUTPUT_NAME gesetzt werden. */
  outputFile?: string;
  /** Verzeichnis der Playwright-Konfiguration (wird von Playwright automatisch gesetzt) */
  configDir?: string;
  /** Environment-Informationen für den Report (alternativ können die Felder auch direkt übergeben werden) */
  environment?: ReportEnvironment;
  /** Upload-Konfiguration für automatischen Upload an Stabilify-Server */
  upload?: UploadOptions;
}

/**
 * Status eines Test-Schritts
 */
export type StepStatus = "passed" | "failed";

/**
 * Erweitertes Step-Interface mit Status (inspiriert von CTRF)
 */
export interface FailureStep {
  /** Name/Titel des Steps */
  name: string;
  /** Status des Steps */
  status: StepStatus;
  /** Dauer in Millisekunden */
  duration: number;
  /** Kategorie (z.B. 'test.step', 'hook', 'fixture') */
  category: string;
  /** Fehlermeldung wenn vorhanden */
  error?: string;
}

/**
 * Enthält alle relevanten Fehlerdetails pro Versuch
 */
export interface RetryAttempt {
  /** Status des Versuchs */
  status: "failed";
  /** Dauer in Millisekunden */
  duration: number;
  /** Fehlermeldung */
  message?: string;
  /** Stack Trace */
  trace?: string;
  /** Code-Snippet um den Fehler */
  snippet?: string;
}

/**
 * Interface für die gesammelten Fehlerdaten eines fehlgeschlagenen Tests
 * Erweitert mit Best-Practices aus dem CTRF-Reporter für bessere KI-Analyse
 */
export interface CollectedFailure {
  // === Basis-Identifikation ===
  /** Report ID zur Gruppierung aller Failures eines Test-Runs (UUID) */
  reportId: string;
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
  /** Suite-Pfad (hierarchischer Pfad) */
  suite: string;

  // === Fehlerdetails ===
  /** Gesammelte Fehlerinformationen */
  errors: Array<{
    message: string;
    stack?: string;
    snippet?: string;
    location?: { file: string; line: number; column: number };
  }>;

  /** Ausgeführte Test-Schritte mit Status */
  steps: FailureStep[];

  // === Retry-Informationen (übernommen von CTRF) ===
  /** Retry-Nummer des aktuellen Versuchs */
  retry: number;
  /** Ist der Test flaky? (passed nach vorherigen Fehlern) */
  flaky: boolean;
  /** Details aller vorherigen fehlgeschlagenen Versuche */
  retryAttempts?: RetryAttempt[];

  /** Browser-Information (Name + Version) */
  browser?: string;

  // === Medien/Attachments ===
  /** Pfade zu Screenshots */
  screenshots: string[];
  /** Pfade zu Trace-Dateien */
  traces: string[];
  /** Pfade zu Video-Dateien */
  videos: string[];

  // === Error Context ===
  /**
   * Error-Context von Playwright (Page Snapshot zum Fehlerzeitpunkt).
   * Enthält den Accessibility-Tree der Seite im YAML-Format.
   * Sehr wertvoll für KI-gestützte Fehleranalyse.
   */
  errorContext?: {
    /** Pfad zur error-context.md Datei */
    path: string;
    /** Inhalt der error-context.md Datei (Page Snapshot) */
    content?: string;
  };

  // === Ausgaben ===
  /** Standardausgabe des Tests */
  stdout: string[];
  /** Fehlerausgabe des Tests */
  stderr: string[];

  // === Metadaten ===
  /** Testdauer in Millisekunden */
  duration: number;
  /** Teststatus (failed, timedOut, interrupted) */
  status: string;
  /** Originaler Playwright-Status */
  rawStatus?: string;
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
  private readonly configDir: string;

  /** Konsolidierte Environment-Informationen */
  private readonly environment: ReportEnvironment;

  /** Test-Run Tracker für Metadaten und Statistiken */
  private readonly testRunTracker: TestRunTracker;

  /**
   * Erstellt eine neue Reporter-Instanz.
   *
   * @param options - Konfigurationsoptionen
   */
  constructor(options: SelfHealingReporterOptions = {}) {
    this.options = options;
    this.configDir = options.configDir ?? process.cwd();
    this.environment = this.buildEnvironment(options);
    this.testRunTracker = new TestRunTracker();
  }

  /**
   * Baut das Environment-Objekt aus den Optionen.
   * Unterstützt sowohl verschachtelte als auch flache Struktur.
   */
  private buildEnvironment(
    options: SelfHealingReporterOptions
  ): ReportEnvironment {
    // Wenn environment explizit gesetzt ist, verwende das
    if (options.environment) {
      return options.environment;
    }

    // Ansonsten extrahiere die flachen Environment-Felder aus den Optionen
    const {
      appName,
      appVersion,
      osPlatform,
      osRelease,
      osVersion,
      buildName,
      buildNumber,
      buildUrl,
      repositoryName,
      repositoryUrl,
      branchName,
      commit,
      testEnvironment,
    } = options;

    const env: ReportEnvironment = {};

    // Nur definierte Werte hinzufügen
    if (appName) env.appName = appName;
    if (appVersion) env.appVersion = appVersion;
    if (osPlatform) env.osPlatform = osPlatform;
    if (osRelease) env.osRelease = osRelease;
    if (osVersion) env.osVersion = osVersion;
    if (buildName) env.buildName = buildName;
    if (buildNumber) env.buildNumber = buildNumber;
    if (buildUrl) env.buildUrl = buildUrl;
    if (repositoryName) env.repositoryName = repositoryName;
    if (repositoryUrl) env.repositoryUrl = repositoryUrl;
    if (branchName) env.branchName = branchName;
    if (commit) env.commit = commit;
    if (testEnvironment) env.testEnvironment = testEnvironment;

    return env;
  }

  /**
   * Ermittelt den vollständigen Ausgabepfad basierend auf Umgebungsvariablen und Optionen.
   *
   * Priorität:
   * 1. STABILIFY_OUTPUT_FILE (vollständiger Pfad oder relativ zu configDir)
   * 2. outputFile Option mit Pfad (z.B. "playwright-results/stabilify.json") → relativ zu configDir
   * 3. outputFile Option nur Dateiname + STABILIFY_OUTPUT_DIR
   * 4. STABILIFY_OUTPUT_NAME + STABILIFY_OUTPUT_DIR
   * 5. Default: configDir/self-healing-output/failures-{timestamp}.json
   */
  private resolveOutputPath(): string {
    // Höchste Priorität: Vollständiger Pfad aus Umgebungsvariable
    const envOutputFile = process.env.STABILIFY_OUTPUT_FILE;
    if (envOutputFile) {
      return path.isAbsolute(envOutputFile)
        ? envOutputFile
        : path.join(this.configDir, envOutputFile);
    }

    // Wenn outputFile einen Pfad enthält (mit /), direkt relativ zu configDir auflösen
    const outputFile = this.options.outputFile;
    if (outputFile?.includes("/")) {
      return path.isAbsolute(outputFile)
        ? outputFile
        : path.join(this.configDir, outputFile);
    }

    // Dateiname aus Option oder Umgebungsvariable
    const outputName =
      outputFile ??
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
   * Validiert die Upload-Konfiguration
   */
  private validateUploadConfig(): void {
    const upload = this.options.upload;

    if (!upload) {
      return;
    }

    // API-Key ist erforderlich wenn Upload aktiviert ist
    if (upload.enabled && !upload.apiKey) {
      console.error(
        "[stabilify] ❌ Upload-Konfiguration ungültig: apiKey ist erforderlich wenn enabled=true"
      );
      console.error(
        "[stabilify] Tipp: Setze STABILIFY_API_KEY Umgebungsvariable oder übergebe apiKey in der Konfiguration"
      );
      console.error("[stabilify] Upload wird deaktiviert.");
      upload.enabled = false;
      return;
    }

    // Validiere retryAttempts
    if (
      upload.retryAttempts !== undefined &&
      (upload.retryAttempts < 0 || !Number.isInteger(upload.retryAttempts))
    ) {
      console.warn(
        `[stabilify] ⚠️  Ungültiger Wert für retryAttempts: ${upload.retryAttempts}. Verwende Standard: 3`
      );
      upload.retryAttempts = 3;
    }

    // Validiere retryDelayMs
    if (
      upload.retryDelayMs !== undefined &&
      (upload.retryDelayMs < 0 || !Number.isInteger(upload.retryDelayMs))
    ) {
      console.warn(
        `[stabilify] ⚠️  Ungültiger Wert für retryDelayMs: ${upload.retryDelayMs}. Verwende Standard: 1000`
      );
      upload.retryDelayMs = 1000;
    }

    // Validiere endpoint
    if (upload.endpoint) {
      try {
        new URL(upload.endpoint);
      } catch {
        console.warn(
          `[stabilify] ⚠️  Ungültige URL für endpoint: ${upload.endpoint}. Verwende Standard: https://api.stabilify.dev`
        );
        upload.endpoint = "https://api.stabilify.dev";
      }
    }

    console.log("[stabilify] ✅ Upload-Konfiguration validiert");
    console.log(
      "[stabilify] Endpoint:",
      upload.endpoint || "https://api.stabilify.dev"
    );
    console.log("[stabilify] Retry-Versuche:", upload.retryAttempts ?? 3);
  }

  /**
   * Wird aufgerufen, wenn die Testsuite beginnt.
   *
   * @param _config - Playwright Konfiguration (nicht verwendet)
   * @param _suite - Root-Suite mit allen Tests (nicht verwendet)
   */
  onBegin(_config: FullConfig, _suite: Suite): void {
    const testRunInfo = this.testRunTracker.getTestRunInfo();

    console.log("[stabilify] Reporter gestartet");
    console.log("[stabilify] Report ID:", testRunInfo.reportId);
    console.log("[stabilify] configDir:", this.configDir);
    console.log(
      "[stabilify] Output wird geschrieben nach:",
      this.resolveOutputPath()
    );

    // CI/CD Metadaten loggen wenn vorhanden
    if (testRunInfo.ciMetadata.provider) {
      console.log("[stabilify] CI Provider:", testRunInfo.ciMetadata.provider);
      if (testRunInfo.ciMetadata.branch) {
        console.log("[stabilify] Branch:", testRunInfo.ciMetadata.branch);
      }
      if (testRunInfo.ciMetadata.commit) {
        console.log(
          "[stabilify] Commit:",
          testRunInfo.ciMetadata.commit.substring(0, 8)
        );
      }
    }

    // Upload-Konfiguration validieren wenn aktiviert
    if (this.options.upload?.enabled) {
      this.validateUploadConfig();
    }
  }

  /**
   * Wird nach jedem Test aufgerufen.
   * Sammelt Fehlerdaten bei nicht bestandenen Tests.
   *
   * @param test - Der ausgeführte Testfall
   * @param result - Das Testergebnis
   */
  onTestEnd(test: TestCase, result: TestResult): void {
    console.log(
      `[stabilify] Test beendet: ${test.title} - Status: ${result.status}`
    );

    // Test-Statistiken aktualisieren
    this.testRunTracker.recordTestResult(result.status);

    // Nur bei Fehlern sammeln
    if (result.status === "passed" || result.status === "skipped") {
      return;
    }

    console.log(`[stabilify] Fehler gesammelt für: ${test.title}`);
    this.collectFailureInfo(test, result);
  }

  /**
   * Wird am Ende der Testsuite aufgerufen.
   * Speichert alle gesammelten Fehlerdaten (auch wenn leer).
   *
   * @param _result - Das Gesamtergebnis der Testsuite (nicht verwendet)
   */
  async onEnd(_result: FullResult): Promise<void> {
    console.log(
      `[stabilify] Testsuite beendet. ${this.failures.length} Fehler gesammelt.`
    );
    console.log(`[stabilify] ${this.testRunTracker.getSummary()}`);
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
    // Suite-Pfad aufbauen (wie CTRF)
    const suitePath = this.buildSuitePath(test);

    // Browser-Info extrahieren (wie CTRF)
    const browserInfo = this.extractBrowserInfo(result);

    // Flaky-Detection: Test ist flaky wenn er nach Retries bestanden hat
    // Da wir nur bei Fehlern sammeln, ist flaky hier immer false
    // Aber wir behalten das Feld für Konsistenz
    const isFlaky = result.status === "passed" && result.retry > 0;

    // Steps mit Status verarbeiten
    const processedSteps = this.processSteps(result.steps);

    // Retry-Attempts aus vorherigen Ergebnissen sammeln
    const retryAttempts = this.collectRetryAttempts(test);

    const failure: CollectedFailure = {
      // Basis-Identifikation
      reportId: this.testRunTracker.getReportId(),
      testId: test.id,
      title: test.titlePath().join(" › "),
      file: test.location.file,
      location: { line: test.location.line, column: test.location.column },
      projectName: test.titlePath()[1] || "default",
      suite: suitePath,

      // Fehlerdetails
      errors: result.errors.map((e) => ({
        message: e.message || "Unknown error",
        stack: e.stack,
        snippet: e.snippet,
        location: e.location,
      })),

      // Steps mit Status
      steps: processedSteps,

      // Retry-Informationen
      retry: result.retry,
      flaky: isFlaky,
      retryAttempts: retryAttempts.length > 0 ? retryAttempts : undefined,

      // Browser
      browser: browserInfo,

      // Medien
      screenshots: [],
      traces: [],
      videos: [],

      // Ausgaben
      stdout: result.stdout.map(String),
      stderr: result.stderr.map(String),

      // Metadaten
      duration: result.duration,
      status: result.status,
      rawStatus: result.status,
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
      } else if (attachment.name === "error-context") {
        // Error-Context von Playwright extrahieren (Page Snapshot)
        failure.errorContext = this.extractErrorContext(attachment);
      }
    }

    this.failures.push(failure);
  }

  /**
   * Baut den Suite-Pfad aus der Test-Hierarchie auf (wie CTRF)
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
   * Extrahiert Browser-Informationen aus dem metadata.json Attachment (wie CTRF)
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
   * Extrahiert Error-Context von Playwright (Page Snapshot)
   */
  private extractErrorContext(attachment: {
    name: string;
    contentType: string;
    path?: string;
    body?: Buffer;
  }): CollectedFailure["errorContext"] {
    const errorContextPath = attachment.path;

    if (!errorContextPath) {
      // Falls nur embedded Body vorhanden
      if (attachment.body) {
        return {
          path: "[embedded]",
          content: attachment.body.toString("utf-8"),
        };
      }
      return undefined;
    }

    // Versuche den Inhalt zu lesen
    try {
      if (fs.existsSync(errorContextPath)) {
        const content = fs.readFileSync(errorContextPath, "utf-8");
        return {
          path: errorContextPath,
          content: content,
        };
      }
    } catch (error) {
      console.warn(
        `[stabilify] Konnte error-context nicht lesen: ${errorContextPath}`,
        error
      );
    }

    return {
      path: errorContextPath,
      content: undefined,
    };
  }

  /**
   * Verarbeitet Steps rekursiv und fügt Status hinzu (inspiriert von CTRF)
   */
  private processSteps(steps: TestResult["steps"]): FailureStep[] {
    const result: FailureStep[] = [];

    for (const step of steps) {
      // Nur test.step Kategorien verarbeiten (wie CTRF)
      if (step.category === "test.step") {
        const stepStatus: StepStatus =
          step.error === undefined ? "passed" : "failed";

        result.push({
          name: step.title,
          status: stepStatus,
          duration: step.duration,
          category: step.category,
          error: step.error ? step.error.message : undefined,
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
   * Sammelt Details aller vorherigen fehlgeschlagenen Retry-Versuche (wie CTRF)
   */
  private collectRetryAttempts(test: TestCase): RetryAttempt[] {
    // Nur vorherige Versuche (alle außer dem letzten)
    if (test.results.length <= 1) {
      return [];
    }

    const previousResults = test.results.slice(0, -1);
    const failedStatuses = new Set(["failed", "timedOut"]);

    return previousResults
      .filter((result) => failedStatuses.has(result.status))
      .map((prevResult) => this.createRetryAttempt(prevResult));
  }

  /**
   * Erstellt ein RetryAttempt-Objekt aus einem TestResult
   */
  private createRetryAttempt(result: TestResult): RetryAttempt {
    const error = result.errors[0];
    return {
      status: "failed",
      duration: result.duration,
      message: error ? error.message : undefined,
      trace: error ? error.stack : undefined,
      snippet: error ? error.snippet : undefined,
    };
  }

  /**
   * Schreibt den Report (auch wenn keine Fehler vorliegen).
   */
  private async writeReport(): Promise<void> {
    const filePath = this.resolveOutputPath();
    console.log("[stabilify] Schreibe Report nach:", filePath);

    // Stelle sicher, dass das Verzeichnis existiert
    const dir = path.dirname(filePath);
    console.log("[stabilify] Verzeichnis:", dir);

    if (!fs.existsSync(dir)) {
      console.log("[stabilify] Erstelle Verzeichnis:", dir);
      fs.mkdirSync(dir, { recursive: true });
    }

    // Environment nur hinzufügen wenn es nicht leer ist
    const hasEnvironment = Object.keys(this.environment).length > 0;

    // Test-Run Informationen
    const testRunInfo = this.testRunTracker.getTestRunInfo();

    const report = {
      timestamp: new Date().toISOString(),
      reportId: testRunInfo.reportId,
      ...(hasEnvironment && { environment: this.environment }),
      ciMetadata: testRunInfo.ciMetadata,
      stats: testRunInfo.stats,
      totalFailures: this.failures.length,
      failures: this.failures,
    };

    try {
      fs.writeFileSync(filePath, JSON.stringify(report, null, 2));
      console.log("[stabilify] ✅ Report erfolgreich geschrieben:", filePath);
    } catch (error) {
      console.error("[stabilify] ❌ Fehler beim Schreiben des Reports:", error);
    }
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
