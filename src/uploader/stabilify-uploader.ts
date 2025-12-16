/**
 * Stabilify Uploader
 *
 * Verantwortlich für den Upload von Test-Artefakten und dem Test-Report
 * an den Stabilify-Server.
 *
 * @module uploader/stabilify-uploader
 */

import * as fs from "node:fs";
import * as path from "node:path";
import type { StabilifyTestReport } from "../types/stabilify-report";
import { FileCollector } from "./file-collector";
import { RetryHandler } from "./retry-handler";
import type { FileToUpload, FileType } from "./types";

// Re-Export types
export type { FileToUpload, FileType } from "./types";

/**
 * Request-Body für getUploadUrls Endpoint.
 */
export interface GetUploadUrlsRequest {
  /** Report-ID zur Organisation der Dateien im Storage */
  reportId: string;
  files: Array<{
    testId: string;
    fileName: string;
    contentType: string;
    fileType: FileType;
  }>;
}

/**
 * Informationen über eine signierte Upload-URL.
 */
export interface UploadUrlInfo {
  testId: string;
  fileName: string;
  uploadUrl: string;
  destination: string;
  requiredHeaders: Record<string, string>;
}

/**
 * Response-Body vom getUploadUrls Endpoint.
 */
export interface GetUploadUrlsResponse {
  success: boolean;
  tenantId: string;
  uploadUrls: UploadUrlInfo[];
  expiresAt: string;
}

/**
 * Request-Body für submitTestRun Endpoint.
 */
export interface SubmitTestRunRequest {
  report: StabilifyTestReport;
}

/**
 * Response-Body vom submitTestRun Endpoint.
 */
export interface SubmitTestRunResponse {
  success: boolean;
  reportId: string;
  linkedFilesCount: number;
}

/**
 * Konfigurationsoptionen für den StabilifyUploader.
 */
export interface UploaderOptions {
  apiKey: string;
  retryAttempts?: number;
  retryDelayMs?: number;
}

/**
 * StabilifyUploader Klasse
 */
export class StabilifyUploader {
  private readonly apiKey: string;
  // TODO: Endpoints konfigurierbar machen oder aus Env lesen
  private readonly getUploadUrlsEndpoint =
    "https://getuploadurls-euownvpvfa-ey.a.run.app";
  private readonly submitTestRunEndpoint =
    "https://submittestrun-euownvpvfa-ey.a.run.app"; // Neuer Endpoint Name

  private readonly fileCollector: FileCollector;
  private readonly retryHandler: RetryHandler;

  constructor(options: UploaderOptions) {
    this.apiKey = options.apiKey;
    this.fileCollector = new FileCollector();
    this.retryHandler = new RetryHandler({
      maxAttempts: options.retryAttempts ?? 3,
      delayMs: options.retryDelayMs ?? 1000,
    });
  }

  /**
   * Führt den kompletten Upload-Flow aus.
   */
  async uploadTestRun(
    report: StabilifyTestReport
  ): Promise<SubmitTestRunResponse> {
    console.log(
      `[stabilify] Starting upload flow for report ${report.reportId}...`
    );

    // Phase 1: Dateien sammeln
    const files = this.fileCollector.collect(report);
    const failedTests = report.results.tests.filter(
      (t) => t.status === "failed"
    );

    if (files.length > 0) {
      console.log(
        `[stabilify] Collected ${files.length} file(s) from ${failedTests.length} failed test(s) to upload`
      );
    } else if (failedTests.length > 0) {
      console.log(
        `[stabilify] ℹ️  ${failedTests.length} test(s) failed, but no files (traces/screenshots/videos) found to upload`
      );
    } else {
      console.log(
        "[stabilify] ✓ All tests passed - no files to upload (only JSON report will be sent)"
      );
    }

    // Phase 2 & 3: Nur wenn Dateien vorhanden sind
    if (files.length > 0) {
      await this.handleFileUploads(files, report);
    }

    // Phase 4: Report an Server senden (mit aktualisierten Storage-Pfaden)
    console.log("[stabilify] Uploading test report (JSON)...");
    return await this.submitTestRun(report);
  }

  /**
   * Handhabt den Upload der Dateien (URLs holen + Upload).
   */
  private async handleFileUploads(
    files: FileToUpload[],
    report: StabilifyTestReport
  ): Promise<void> {
    // Signierte URLs holen
    const { uploadUrls, tenantId, expiresAt } = await this.retryHandler.execute(
      () => this.getUploadUrls(files, report.reportId),
      "Get Upload URLs"
    );

    console.log(
      `[stabilify] Received upload URLs for tenant: ${tenantId} (expires: ${expiresAt})`
    );

    // Report-Pfade aktualisieren (lokale Pfade -> Storage-Pfade)
    this.updateReportPaths(report, uploadUrls);
    console.log("[stabilify] Updated report paths to storage paths");

    // Dateien hochladen
    const uploadedCount = await this.uploadFiles(files, uploadUrls);
    console.log(`[stabilify] Successfully uploaded ${uploadedCount} file(s)`);
  }

  /**
   * Fordert signierte Upload-URLs vom Server an.
   */
  private async getUploadUrls(
    files: FileToUpload[],
    reportId: string
  ): Promise<GetUploadUrlsResponse> {
    const requestBody: GetUploadUrlsRequest = {
      reportId,
      files: files.map((file) => ({
        testId: file.testId,
        fileName: file.fileName,
        contentType: file.contentType,
        fileType: file.fileType,
      })),
    };

    console.log(
      `[stabilify] Requesting upload URLs for ${files.length} file(s)...`
    );

    const response = await fetch(this.getUploadUrlsEndpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": this.apiKey,
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();

      // Spezifische Fehlermeldungen für häufige Probleme
      if (response.status === 401 || response.status === 403) {
        throw new Error(
          `Authentication failed (${response.status}): Ungültiger API Key. Bitte überprüfe deinen API Key.`
        );
      }

      throw new Error(
        `Failed to get upload URLs (${response.status}): ${errorText}`
      );
    }

    const data = (await response.json()) as GetUploadUrlsResponse;

    if (!data.success || !data.uploadUrls || !data.tenantId) {
      throw new Error("Invalid response from getUploadUrls endpoint");
    }

    return data;
  }

  /**
   * Lädt alle Dateien parallel hoch.
   */
  private async uploadFiles(
    files: FileToUpload[],
    uploadUrls: UploadUrlInfo[]
  ): Promise<number> {
    const urlMap = new Map<string, UploadUrlInfo>();
    for (const urlInfo of uploadUrls) {
      const key = `${urlInfo.testId}:${urlInfo.fileName}`;
      urlMap.set(key, urlInfo);
    }

    const uploadPromises = files.map(async (file) => {
      const key = `${file.testId}:${file.fileName}`;
      const urlInfo = urlMap.get(key);

      if (!urlInfo) {
        console.warn(
          `[stabilify] No upload URL found for ${file.fileName} (test: ${file.testId})`
        );
        return false;
      }

      // Retry für einzelnen Datei-Upload
      try {
        return await this.retryHandler.execute(async () => {
          const fileBuffer = fs.readFileSync(file.localPath);
          const response = await fetch(urlInfo.uploadUrl, {
            method: "PUT",
            headers: urlInfo.requiredHeaders,
            body: fileBuffer,
          });

          if (!response.ok) {
            throw new Error(`Upload failed with status ${response.status}`);
          }
          return true;
        }, `Upload ${file.fileName}`);
      } catch (error) {
        console.error(`[stabilify] Failed to upload ${file.fileName}:`, error);
        return false;
      }
    });

    const results = await Promise.all(uploadPromises);
    return results.filter(Boolean).length;
  }

  /**
   * Aktualisiert die Pfade im Report von lokalen Pfaden zu Storage-Pfaden.
   * Dies muss nach dem Erhalt der Upload-URLs und vor dem Hochladen der Dateien erfolgen.
   */
  private updateReportPaths(
    report: StabilifyTestReport,
    uploadUrls: UploadUrlInfo[]
  ): void {
    // Map erstellen: testId:fileName -> destination (Storage-Pfad)
    const pathMap = new Map<string, string>();
    for (const urlInfo of uploadUrls) {
      const key = `${urlInfo.testId}:${urlInfo.fileName}`;
      pathMap.set(key, urlInfo.destination);
    }

    // Alle Tests durchgehen und Pfade aktualisieren
    for (const test of report.results.tests) {
      const testId = test.extra.testId;

      // Attachments aktualisieren (Screenshots, Traces, Videos)
      if (test.attachments) {
        for (const attachment of test.attachments) {
          if (attachment.path && attachment.path !== "[embedded]") {
            const fileName = path.basename(attachment.path);
            const key = `${testId}:${fileName}`;
            const storagePath = pathMap.get(key);
            if (storagePath) {
              attachment.path = storagePath;
            }
          }
        }
      }

      // Error Context aktualisieren
      if (test.extra.errorContext?.storagePath) {
        const fileName = path.basename(test.extra.errorContext.storagePath);
        const key = `${testId}:${fileName}`;
        const storagePath = pathMap.get(key);
        if (storagePath) {
          test.extra.errorContext.storagePath = storagePath;
        }
      }
    }
  }

  /**
   * Sendet den Test-Report an den Server.
   */
  private async submitTestRun(
    report: StabilifyTestReport
  ): Promise<SubmitTestRunResponse> {
    return await this.retryHandler.execute(async () => {
      const response = await fetch(this.submitTestRunEndpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": this.apiKey,
        },
        body: JSON.stringify({ report } as SubmitTestRunRequest),
      });

      if (!response.ok) {
        const errorText = await response.text();

        // Spezifische Fehlermeldungen für häufige Probleme
        if (response.status === 401 || response.status === 403) {
          throw new Error(
            `Authentication failed (${response.status}): Ungültiger API Key. Bitte überprüfe deinen API Key.`
          );
        }

        throw new Error(
          `Failed to submit test run (${response.status}): ${errorText}`
        );
      }

      const data = (await response.json()) as SubmitTestRunResponse;

      if (!data.success) {
        throw new Error("Invalid response from submitTestRun endpoint");
      }

      console.log(
        `[stabilify] ✅ Test run submitted successfully (ID: ${data.reportId})`
      );
      return data;
    }, "Submit Test Run");
  }
}
