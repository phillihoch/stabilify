/**
 * Test-Run Tracking
 *
 * Dieses Modul verwaltet Test-Run Metadaten und Statistiken während eines Playwright-Testlaufs.
 *
 * @module utils/test-run-tracker
 */

import { randomUUID } from "node:crypto";
import type { CiMetadata } from "./ci-metadata";
import { collectCiMetadata } from "./ci-metadata";

/**
 * Test-Statistiken für einen Test-Run
 */
export interface TestRunStats {
  /** Gesamtanzahl der Tests */
  totalTests: number;
  /** Anzahl fehlgeschlagener Tests */
  failedTests: number;
  /** Anzahl bestandener Tests */
  passedTests: number;
  /** Anzahl übersprungener Tests */
  skippedTests: number;
}

/**
 * Vollständige Test-Run Informationen
 */
export interface TestRunInfo {
  /** Eindeutige Report ID (UUID) für diesen Test-Run */
  reportId: string;
  /** CI/CD Metadaten */
  ciMetadata: CiMetadata;
  /** Test-Statistiken */
  stats: TestRunStats;
  /** Startzeitpunkt des Test-Runs */
  startedAt: string;
}

/**
 * Test-Run Tracker Klasse
 *
 * Verwaltet Metadaten und Statistiken für einen einzelnen Test-Run.
 */
export class TestRunTracker {
  private readonly reportId: string;
  private readonly ciMetadata: CiMetadata;
  private readonly stats: TestRunStats;
  private readonly startedAt: string;

  constructor() {
    this.reportId = randomUUID();
    this.ciMetadata = collectCiMetadata();
    this.stats = {
      totalTests: 0,
      failedTests: 0,
      passedTests: 0,
      skippedTests: 0,
    };
    this.startedAt = new Date().toISOString();
  }

  /**
   * Gibt die Report ID zurück
   */
  getReportId(): string {
    return this.reportId;
  }

  /**
   * Gibt die CI/CD Metadaten zurück
   */
  getCiMetadata(): CiMetadata {
    return this.ciMetadata;
  }

  /**
   * Gibt die aktuellen Test-Statistiken zurück
   */
  getStats(): TestRunStats {
    return { ...this.stats };
  }

  /**
   * Gibt alle Test-Run Informationen zurück
   */
  getTestRunInfo(): TestRunInfo {
    return {
      reportId: this.reportId,
      ciMetadata: this.ciMetadata,
      stats: this.getStats(),
      startedAt: this.startedAt,
    };
  }

  /**
   * Aktualisiert die Statistiken basierend auf einem Test-Status
   */
  recordTestResult(status: string): void {
    this.stats.totalTests++;

    switch (status) {
      case "passed":
        this.stats.passedTests++;
        break;
      case "failed":
      case "timedOut":
      case "interrupted":
        this.stats.failedTests++;
        break;
      case "skipped":
        this.stats.skippedTests++;
        break;
    }
  }

  /**
   * Gibt eine Zusammenfassung des Test-Runs als String zurück
   */
  getSummary(): string {
    const { totalTests, passedTests, failedTests, skippedTests } = this.stats;
    const provider = this.ciMetadata.provider || "local";
    const branch = this.ciMetadata.branch || "unknown";

    return `Test-Run ${this.reportId.substring(0, 8)} (${provider}/${branch}): ${totalTests} tests (${passedTests} passed, ${failedTests} failed, ${skippedTests} skipped)`;
  }
}

