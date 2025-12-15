/**
 * File Collector
 *
 * Sammelt alle hochzuladenden Dateien aus einem Stabilify Test Report.
 */

import * as fs from "node:fs";
import * as path from "node:path";
import type { StabilifyTestReport } from "../types/stabilify-report";
import type { FileToUpload } from "./types";

export class FileCollector {
  /**
   * Sammelt alle hochzuladenden Dateien aus dem Report.
   *
   * Sammelt nur Dateien von fehlgeschlagenen Tests, unabhängig von der Playwright trace-Konfiguration.
   * Dies spart Firebase Storage-Kosten, da nur relevante Dateien hochgeladen werden.
   *
   * Durchläuft alle Tests und extrahiert Screenshots, Traces, Videos und Error-Context-Dateien.
   * Prüft mit fs.existsSync(), ob die Datei tatsächlich existiert.
   *
   * @param report - Der vollständige Test-Report
   * @returns Array von FileToUpload-Objekten (nur von fehlgeschlagenen Tests)
   */
  collect(report: StabilifyTestReport): FileToUpload[] {
    const files: FileToUpload[] = [];

    for (const test of report.results.tests) {
      // Nur Dateien von fehlgeschlagenen Tests hochladen
      if (test.status !== "failed") {
        continue;
      }

      const testId = test.extra.testId;

      // Attachments verarbeiten
      if (test.attachments) {
        for (const attachment of test.attachments) {
          // Überspringe embedded Attachments
          if (attachment.path === "[embedded]" || !attachment.path) {
            continue;
          }

          // Prüfe ob Datei existiert
          if (fs.existsSync(attachment.path)) {
            let fileType: FileToUpload["fileType"] | undefined;

            if (attachment.contentType.startsWith("image/")) {
              fileType = "screenshot";
            } else if (attachment.name === "trace") {
              fileType = "trace";
            } else if (attachment.contentType.startsWith("video/")) {
              fileType = "video";
            }

            if (fileType) {
              files.push({
                testId: testId,
                localPath: attachment.path,
                fileName: path.basename(attachment.path),
                contentType: attachment.contentType,
                fileType: fileType,
              });
            }
          }
        }
      }

      // Error Context verarbeiten (nur bei Failures)
      if (test.extra.errorContext?.storagePath) {
        const contextPath = test.extra.errorContext.storagePath;
        if (fs.existsSync(contextPath)) {
          files.push({
            testId: testId,
            localPath: contextPath,
            fileName: path.basename(contextPath),
            contentType: "text/markdown", // oder application/yaml
            fileType: "error-context",
          });
        }
      }
    }

    return files;
  }
}
