/**
 * Stabilify Uploader
 *
 * Verantwortlich für den Upload von Test-Artefakten und dem Test-Report
 * an den Stabilify-Server.
 *
 * @module uploader/stabilify-uploader
 */

import * as fs from "node:fs";
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
    console.log(`[stabilify] Collected ${files.length} file(s) to upload`);

    // Phase 2 & 3: Nur wenn Dateien vorhanden sind
    if (files.length > 0) {
      await this.handleFileUploads(files);
    } else {
      console.log("[stabilify] No files to upload, skipping upload phase");
    }

    // Phase 4: Report an Server senden
    return await this.submitTestRun(report);
  }

  /**
   * Handhabt den Upload der Dateien (URLs holen + Upload).
   */
  private async handleFileUploads(files: FileToUpload[]): Promise<void> {
    // Signierte URLs holen
    const { uploadUrls, tenantId, expiresAt } = await this.retryHandler.execute(
      () => this.getUploadUrls(files),
      "Get Upload URLs"
    );

    console.log(
      `[stabilify] Received upload URLs for tenant: ${tenantId} (expires: ${expiresAt})`
    );

    // Dateien hochladen
    const uploadedCount = await this.uploadFiles(files, uploadUrls);
    console.log(`[stabilify] Successfully uploaded ${uploadedCount} file(s)`);
  }

  /**
   * Fordert signierte Upload-URLs vom Server an.
   */
  private async getUploadUrls(
    files: FileToUpload[]
  ): Promise<GetUploadUrlsResponse> {
    const requestBody: GetUploadUrlsRequest = {
      files: files.map((file) => ({
        testId: file.testId,
        fileName: file.fileName,
        contentType: file.contentType,
        fileType: file.fileType,
      })),
    };

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
