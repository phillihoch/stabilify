/**
 * Stabilify Uploader
 *
 * Verantwortlich für den Upload von Test-Artefakten (Screenshots, Traces, Videos)
 * an den Stabilify-Server über signierte URLs.
 *
 * @module uploader/stabilify-uploader
 */

import * as fs from "node:fs";
import * as path from "node:path";
import type { CollectedFailure } from "../self-healing-reporter";

/**
 * Unterstützte Dateitypen für den Upload.
 */
export type FileType = "screenshot" | "trace" | "video";

/**
 * Eine Datei, die hochgeladen werden soll.
 */
export interface FileToUpload {
  /** Test-ID zur Zuordnung der Datei */
  testId: string;
  /** Vollständiger lokaler Pfad zur Datei */
  localPath: string;
  /** Dateiname (extrahiert mit path.basename()) */
  fileName: string;
  /** MIME-Type (z.B. "image/png", "application/zip", "video/webm") */
  contentType: string;
  /** Art der Datei */
  fileType: FileType;
}

/**
 * Konfigurationsoptionen für den StabilifyUploader.
 */
export interface UploaderOptions {
  /** API-Schlüssel für die Authentifizierung */
  apiKey: string;
  /** Server-URL (Standard: https://api.stabilify.dev) */
  endpoint?: string;
  /** Anzahl der Wiederholungsversuche bei Fehlern (Standard: 3) */
  retryAttempts?: number;
  /** Verzögerung zwischen Wiederholungen in Millisekunden (Standard: 1000) */
  retryDelayMs?: number;
}

/**
 * StabilifyUploader Klasse
 *
 * Verantwortlich für das Sammeln und Hochladen von Test-Artefakten.
 */
export class StabilifyUploader {
  private readonly apiKey: string;
  private readonly endpoint: string;
  private readonly retryAttempts: number;
  private readonly retryDelayMs: number;

  constructor(options: UploaderOptions) {
    this.apiKey = options.apiKey;
    this.endpoint = options.endpoint || "https://api.stabilify.dev";
    this.retryAttempts = options.retryAttempts ?? 3;
    this.retryDelayMs = options.retryDelayMs ?? 1000;
  }

  /**
   * Sammelt alle hochzuladenden Dateien aus den Failures.
   *
   * Durchläuft alle Failures und extrahiert Screenshots, Traces und Videos.
   * Prüft mit fs.existsSync(), ob die Datei tatsächlich existiert, bevor sie
   * zur Upload-Liste hinzugefügt wird.
   *
   * @param failures - Array von CollectedFailure-Objekten
   * @returns Array von FileToUpload-Objekten mit allen gefundenen und existierenden Dateien
   */
  collectFilesToUpload(failures: CollectedFailure[]): FileToUpload[] {
    const files: FileToUpload[] = [];

    for (const failure of failures) {
      // Screenshots sammeln
      for (const screenshotPath of failure.screenshots) {
        // Überspringe embedded Screenshots (haben keinen echten Pfad)
        if (screenshotPath === "[embedded]") {
          continue;
        }

        // Prüfe ob Datei existiert
        if (fs.existsSync(screenshotPath)) {
          files.push({
            testId: failure.testId,
            localPath: screenshotPath,
            fileName: path.basename(screenshotPath),
            contentType: "image/png",
            fileType: "screenshot",
          });
        }
      }

      // Traces sammeln
      for (const tracePath of failure.traces) {
        // Überspringe embedded Traces
        if (tracePath === "[embedded]") {
          continue;
        }

        // Prüfe ob Datei existiert
        if (fs.existsSync(tracePath)) {
          files.push({
            testId: failure.testId,
            localPath: tracePath,
            fileName: path.basename(tracePath),
            contentType: "application/zip",
            fileType: "trace",
          });
        }
      }

      // Videos sammeln
      for (const videoPath of failure.videos) {
        // Überspringe embedded Videos
        if (videoPath === "[embedded]") {
          continue;
        }

        // Prüfe ob Datei existiert
        if (fs.existsSync(videoPath)) {
          files.push({
            testId: failure.testId,
            localPath: videoPath,
            fileName: path.basename(videoPath),
            contentType: "video/webm",
            fileType: "video",
          });
        }
      }
    }

    return files;
  }
}

