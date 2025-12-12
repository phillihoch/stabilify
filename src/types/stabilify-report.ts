/**
 * Stabilify Report Type Definitions
 *
 * Erweitert den CTRF-Standard um Stabilify-spezifische Felder für KI-Analyse.
 */

import type { CiMetadata } from "../utils/ci-metadata";
import type {
  CtrfEnvironment,
  CtrfReport,
  CtrfSummary,
  CtrfTest,
} from "./ctrf";

/**
 * Stabilify-spezifische Erweiterungen für einen einzelnen Test
 */
export interface StabilifyTestExtra {
  /** Playwright Test ID */
  testId: string;
  /** Projekt Name (z.B. "chromium", "firefox") */
  projectName: string;
  /** Position im Quellcode */
  location: {
    line: number;
    column: number;
  };

  /**
   * Error-Context von Playwright (nur bei Failures)
   * Enthält Page Snapshot (Accessibility Tree im YAML-Format)
   */
  errorContext?: {
    /** Pfad zur Datei im Storage */
    storagePath?: string;
    /** Inhalt (inline, wenn unter 10KB) */
    content?: string;
  };

  /**
   * Alle Fehler mit vollständigen Details (nur bei Failures)
   * CTRF hat nur message/trace/snippet - wir speichern mehr
   */
  errors?: Array<{
    message: string;
    stack?: string;
    snippet?: string;
    location?: {
      file: string;
      line: number;
      column: number;
    };
  }>;
}

/**
 * Erweiterter Test-Typ
 */
export interface StabilifyTest extends CtrfTest {
  extra: StabilifyTestExtra;
}

/**
 * Stabilify-spezifische Erweiterungen für die Summary
 */
export interface StabilifySummaryExtra {
  /** Anzahl flaky Tests (passed nach retry) */
  flakyCount: number;
  /** Anzahl Retries insgesamt */
  totalRetries: number;
  /** Gesamtdauer in ms */
  durationMs: number;
}

/**
 * Erweiterte Summary
 */
export interface StabilifyTestSummary extends CtrfSummary {
  extra: StabilifySummaryExtra;
}

/**
 * Stabilify-spezifische Erweiterungen für das Environment
 */
export interface StabilifyEnvironmentExtra {
  /** Node.js Version */
  nodeVersion?: string;
  /** Playwright Version */
  playwrightVersion?: string;
}

/**
 * Erweitertes Environment
 */
export interface StabilifyEnvironment extends CtrfEnvironment {
  extra: StabilifyEnvironmentExtra;
}

/**
 * Stabilify-spezifische Metadaten auf Top-Level
 */
export interface StabilifyReportExtra {
  /** CI/CD Provider Metadaten */
  ciMetadata: CiMetadata;
  /** Stabilify-spezifische Konfiguration */
  stabilify: {
    /** Reporter-Version */
    reporterVersion: string;
    /** Upload-Status (wenn aktiviert) */
    uploadStatus?: "pending" | "completed" | "failed";
    /** Tenant-ID (nach Upload) */
    tenantId?: string;
  };
}

/**
 * Der vollständige Stabilify Test Report
 */
export interface StabilifyTestReport extends Omit<CtrfReport, "results"> {
  reportFormat: "CTRF";
  specVersion: "0.0.0";
  reportId: string;
  timestamp: string;
  generatedBy: "stabilify-reporter";
  results: {
    tool: CtrfReport["results"]["tool"];
    summary: StabilifyTestSummary;
    tests: StabilifyTest[];
    environment?: StabilifyEnvironment;
    extra: StabilifyReportExtra;
  };
}
