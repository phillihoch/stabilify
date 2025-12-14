/**
 * Stabilify Reporter
 *
 * Ein Custom Playwright Reporter, der Test-Ergebnisse im CTRF-Format sammelt
 * und um Stabilify-spezifische Daten für KI-Analyse erweitert.
 */

import type {
  FullConfig,
  FullResult,
  Reporter,
  Suite,
  TestCase,
  TestResult,
} from "@playwright/test/reporter";
import type {
  StabilifyEnvironment,
  StabilifyTest,
  StabilifyTestReport,
} from "../types/stabilify-report";
import { StabilifyUploader } from "../uploader/stabilify-uploader";
import { collectCiMetadata } from "../utils/ci-metadata";
import { EnvironmentCollector } from "../utils/environment-collector";
import { TestRunTracker } from "../utils/test-run-tracker";
import { ReportWriter } from "./report-writer";
import { SummaryCalculator } from "./summary-calculator";
import { TestProcessor } from "./test-processor";

export interface UploadOptions {
  enabled: boolean;
  apiKey: string;
  retryAttempts?: number;
  retryDelayMs?: number;
}

export interface StabilifyReporterOptions
  extends Partial<StabilifyEnvironment> {
  outputFile?: string;
  configDir?: string;
  environment?: StabilifyEnvironment;
  upload?: UploadOptions;
}

export class StabilifyReporter implements Reporter {
  private readonly tests: StabilifyTest[] = [];
  private startTime: number = 0;
  private readonly configDir: string;
  private readonly testRunTracker: TestRunTracker;
  private readonly testProcessor: TestProcessor;
  private readonly summaryCalculator: SummaryCalculator;
  private readonly reportWriter: ReportWriter;
  private readonly environmentCollector: EnvironmentCollector;

  constructor(private readonly options: StabilifyReporterOptions = {}) {
    this.configDir = options.configDir ?? process.cwd();
    this.testRunTracker = new TestRunTracker();
    this.testProcessor = new TestProcessor();
    this.summaryCalculator = new SummaryCalculator();
    this.environmentCollector = new EnvironmentCollector();
    this.reportWriter = new ReportWriter({
      outputFile: options.outputFile,
      configDir: this.configDir,
    });
  }

  onBegin(_config: FullConfig, _suite: Suite): void {
    this.startTime = Date.now();
    const testRunInfo = this.testRunTracker.getTestRunInfo();

    console.log("[stabilify] Reporter gestartet");
    console.log("[stabilify] Report ID:", testRunInfo.reportId);

    if (this.options.upload?.enabled) {
      this.validateUploadConfig();
    }
  }

  onTestEnd(test: TestCase, result: TestResult): void {
    // Test verarbeiten und zur Liste hinzufügen
    const stabilifyTest = this.testProcessor.processTest(test, result);
    this.tests.push(stabilifyTest);

    // Tracker aktualisieren (für Stats)
    this.testRunTracker.recordTestResult(result.status);
  }

  async onEnd(_result: FullResult): Promise<void> {
    const endTime = Date.now();
    console.log(
      `[stabilify] Testsuite beendet. ${this.tests.length} Tests verarbeitet.`
    );

    // Summary berechnen
    const summary = this.summaryCalculator.calculate(
      this.tests,
      this.startTime,
      endTime
    );

    // Environment sammeln
    // WICHTIG: Nur environment-spezifische Optionen übergeben, NICHT die kompletten options
    // (die auch upload.apiKey enthalten würden)
    const environment = this.environmentCollector.collect(
      this.options.environment
    );

    // CI Metadata sammeln
    const ciMetadata = collectCiMetadata();

    // Test Run Info holen (für Report ID)
    const testRunInfo = this.testRunTracker.getTestRunInfo();

    // Report zusammenbauen
    const report: StabilifyTestReport = {
      reportFormat: "CTRF",
      specVersion: "0.0.0",
      reportId: testRunInfo.reportId,
      timestamp: new Date().toISOString(),
      generatedBy: "stabilify-reporter",
      results: {
        tool: {
          name: "playwright",
        },
        summary: summary,
        tests: this.tests,
        environment: environment,
        extra: {
          ciMetadata: ciMetadata,
          stabilify: {
            reporterVersion: "1.0.0", // TODO: Version aus package.json
            uploadStatus: this.options.upload?.enabled ? "pending" : undefined,
          },
        },
      },
    };

    // Report schreiben
    await this.reportWriter.write(report);

    // Upload (wenn aktiviert)
    if (this.options.upload?.enabled) {
      await this.uploadReport(report);
    }
  }

  printsToStdio(): boolean {
    return false;
  }

  private validateUploadConfig(): void {
    const upload = this.options.upload;
    if (!upload) return;

    if (upload.enabled && !upload.apiKey) {
      console.error(
        "[stabilify] ❌ Upload-Konfiguration ungültig: apiKey ist erforderlich wenn enabled=true"
      );
      upload.enabled = false;
    }
  }

  private async uploadReport(report: StabilifyTestReport): Promise<void> {
    if (!this.options.upload?.apiKey) return;

    try {
      console.log("[stabilify] Starte Upload-Flow...");
      const uploader = new StabilifyUploader({
        apiKey: this.options.upload.apiKey,
      });

      await uploader.uploadTestRun(report);
    } catch (error) {
      console.error("[stabilify] ❌ Upload fehlgeschlagen:", error);
    }
  }
}

export default StabilifyReporter;
