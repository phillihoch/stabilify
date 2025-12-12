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
 * Request-Body für getUploadUrls Endpoint.
 */
export interface GetUploadUrlsRequest {
  /** Array von Dateien, für die signierte URLs angefordert werden */
  files: Array<{
    /** Test-ID zur Zuordnung */
    testId: string;
    /** Dateiname (z.B. "screenshot-1.png") */
    fileName: string;
    /** MIME-Type (z.B. "image/png") */
    contentType: string;
    /** Art der Datei */
    fileType: FileType;
  }>;
}

/**
 * Informationen über eine signierte Upload-URL.
 */
export interface UploadUrlInfo {
  /** Test-ID zur Zuordnung */
  testId: string;
  /** Dateiname */
  fileName: string;
  /** Signierte PUT-URL (15 Min gültig) */
  uploadUrl: string;
  /** Ziel-Pfad im Storage (gs://bucket/path) */
  destination: string;
  /**
   * Erforderliche HTTP-Header für den Upload.
   * Diese Header müssen beim PUT-Request mitgesendet werden,
   * da sie Teil der Signatur sind.
   */
  requiredHeaders: Record<string, string>;
}

/**
 * Response-Body vom getUploadUrls Endpoint.
 */
export interface GetUploadUrlsResponse {
  /** Erfolgs-Flag */
  success: boolean;
  /** Tenant-ID für Client-Referenz */
  tenantId: string;
  /** Array von signierten Upload-URLs */
  uploadUrls: UploadUrlInfo[];
  /** Ablaufzeitpunkt der URLs (ISO Timestamp) */
  expiresAt: string;
}

/**
 * Request-Body für submitFailure Endpoint.
 */
export interface SubmitFailureRequest {
  /** Eindeutige ID für diesen Test-Run (UUID) */
  reportId: string;
  /** Array von Failures */
  failures: CollectedFailure[];
}

/**
 * Response-Body vom submitFailure Endpoint.
 */
export interface SubmitFailureResponse {
  /** Erfolgs-Flag */
  success: boolean;
  /** Report-ID */
  reportId: string;
  /** Generierte Firestore Document IDs */
  failureIds: string[];
  /** Verknüpfte Dateien pro Test */
  linkedFiles: Array<{
    testId: string;
    files: string[];
  }>;
}

/**
 * Konfigurationsoptionen für den StabilifyUploader.
 */
export interface UploaderOptions {
  /** API-Schlüssel für die Authentifizierung */
  apiKey: string;
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
  private readonly getUploadUrlsEndpoint =
    "https://getuploadurls-euownvpvfa-ey.a.run.app";
  private readonly submitFailureEndpoint =
    "https://submitfailure-euownvpvfa-ey.a.run.app";
  private readonly retryAttempts: number;
  private readonly retryDelayMs: number;

  constructor(options: UploaderOptions) {
    this.apiKey = options.apiKey;
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

  /**
   * Fordert signierte Upload-URLs vom Server an.
   *
   * Sendet einen POST-Request an den /getUploadUrls Endpoint mit dem API-Key
   * im Header und erhält signierte URLs für alle Dateien.
   *
   * @param files - Array von FileToUpload-Objekten
   * @returns Promise mit GetUploadUrlsResponse (tenantId und uploadUrls)
   * @throws Error wenn der Request fehlschlägt oder der API-Key ungültig ist
   */
  async getUploadUrls(files: FileToUpload[]): Promise<GetUploadUrlsResponse> {
    // Request-Body vorbereiten
    const requestBody: GetUploadUrlsRequest = {
      files: files.map((file) => ({
        testId: file.testId,
        fileName: file.fileName,
        contentType: file.contentType,
        fileType: file.fileType,
      })),
    };

    // HTTP POST Request an getUploadUrls Endpoint
    const url = this.getUploadUrlsEndpoint;
    console.log(
      `[stabilify] Requesting upload URLs for ${files.length} files...`
    );

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": this.apiKey,
        },
        body: JSON.stringify(requestBody),
      });

      // Fehlerbehandlung
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `Failed to get upload URLs (${response.status}): ${errorText}`
        );
      }

      // Response parsen
      const data = (await response.json()) as GetUploadUrlsResponse;

      // Validierung
      if (!data.success || !data.uploadUrls || !data.tenantId) {
        throw new Error("Invalid response from getUploadUrls endpoint");
      }

      console.log(
        `[stabilify] Received ${data.uploadUrls.length} upload URLs for tenant: ${data.tenantId}`
      );
      console.log(`[stabilify] URLs expire at: ${data.expiresAt}`);

      return data;
    } catch (error) {
      // Fehler loggen und weiterwerfen
      console.error("[stabilify] Failed to get upload URLs:", error);
      throw error;
    }
  }

  /**
   * Lädt alle Dateien parallel mit den signierten URLs hoch.
   *
   * Führt für jede Datei einen PUT-Request mit der signierten URL durch.
   * Alle Uploads erfolgen parallel mit Promise.all().
   * Nicht existierende Dateien werden übersprungen und geloggt.
   *
   * @param files - Array von FileToUpload-Objekten
   * @param uploadUrls - Array von UploadUrlInfo-Objekten vom Server
   * @returns Promise mit der Anzahl erfolgreich hochgeladener Dateien
   */
  async uploadFiles(
    files: FileToUpload[],
    uploadUrls: UploadUrlInfo[]
  ): Promise<number> {
    console.log(`[stabilify] Starting upload of ${files.length} files...`);

    // Map erstellen für schnellen Zugriff auf Upload-URLs
    const urlMap = new Map<string, UploadUrlInfo>();
    for (const urlInfo of uploadUrls) {
      const key = `${urlInfo.testId}:${urlInfo.fileName}`;
      urlMap.set(key, urlInfo);
    }

    // Upload-Promises sammeln
    const uploadPromises = files.map(async (file) => {
      const key = `${file.testId}:${file.fileName}`;
      const urlInfo = urlMap.get(key);

      if (!urlInfo) {
        console.warn(
          `[stabilify] No upload URL found for ${file.fileName} (test: ${file.testId})`
        );
        return false;
      }

      // Prüfe ob Datei existiert (sollte bereits in collectFilesToUpload geprüft sein)
      if (!fs.existsSync(file.localPath)) {
        console.warn(`[stabilify] File not found, skipping: ${file.localPath}`);
        return false;
      }

      try {
        // Datei lesen
        const fileBuffer = fs.readFileSync(file.localPath);

        // PUT-Request mit signierter URL und allen erforderlichen Headern
        // Die requiredHeaders enthalten Content-Type und alle x-goog-meta-* Header
        const response = await fetch(urlInfo.uploadUrl, {
          method: "PUT",
          headers: urlInfo.requiredHeaders,
          body: fileBuffer,
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error(
            `[stabilify] Failed to upload ${file.fileName}: ${response.status} ${errorText}`
          );
          return false;
        }

        console.log(
          `[stabilify] ✓ Uploaded ${file.fileName} (${file.fileType}) for test ${file.testId}`
        );
        return true;
      } catch (error) {
        console.error(`[stabilify] Error uploading ${file.fileName}:`, error);
        return false;
      }
    });

    // Alle Uploads parallel ausführen
    const results = await Promise.all(uploadPromises);

    // Erfolgreiche Uploads zählen
    const successCount = results.filter(Boolean).length;
    const failedCount = results.length - successCount;

    console.log(
      `[stabilify] Upload complete: ${successCount} successful, ${failedCount} failed`
    );

    return successCount;
  }

  /**
   * Sendet Failure-Daten an den Server.
   *
   * Ruft den /submitFailure Endpoint auf und übermittelt alle Failure-Daten
   * inklusive reportId. Der Server verknüpft die Failures mit den hochgeladenen
   * Dateien und speichert alles in Firestore.
   *
   * @param reportId - Eindeutige Report-ID für diesen Test-Run (UUID)
   * @param failures - Array von CollectedFailure-Objekten
   * @returns Promise mit SubmitFailureResponse (failureIds und linkedFiles)
   * @throws Error wenn der Request fehlschlägt
   */
  async submitFailures(
    reportId: string,
    failures: CollectedFailure[]
  ): Promise<SubmitFailureResponse> {
    const url = this.submitFailureEndpoint;
    console.log(
      `[stabilify] Submitting ${failures.length} failures for report ${reportId}...`
    );

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": this.apiKey,
        },
        body: JSON.stringify({
          reportId,
          failures,
        } as SubmitFailureRequest),
      });

      // Fehlerbehandlung
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `Failed to submit failures (${response.status}): ${errorText}`
        );
      }

      // Response parsen
      const data = (await response.json()) as SubmitFailureResponse;

      // Validierung
      if (!data.success || !data.failureIds) {
        throw new Error("Invalid response from submitFailure endpoint");
      }

      console.log(
        `[stabilify] ✓ Successfully submitted ${data.failureIds.length} failures`
      );
      console.log(
        `[stabilify] Linked ${data.linkedFiles.length} test(s) with uploaded files`
      );

      return data;
    } catch (error) {
      console.error("[stabilify] Failed to submit failures:", error);
      throw error;
    }
  }

  /**
   * Führt den kompletten Upload-Flow aus.
   *
   * Orchestriert alle drei Phasen des Upload-Prozesses:
   * 1. Dateien sammeln aus den Failures
   * 2. Signierte URLs vom Server holen
   * 3. Dateien mit signierten URLs hochladen
   * 4. Failure-Daten an Server senden
   *
   * @param reportId - Eindeutige Report-ID für diesen Test-Run (UUID)
   * @param failures - Array von CollectedFailure-Objekten
   * @returns Promise mit SubmitFailureResponse
   * @throws Error wenn ein Schritt fehlschlägt
   */
  async uploadAll(
    reportId: string,
    failures: CollectedFailure[]
  ): Promise<SubmitFailureResponse> {
    console.log(
      `[stabilify] Starting complete upload flow for ${failures.length} failure(s)...`
    );

    // Phase 1: Dateien sammeln
    const files = this.collectFilesToUpload(failures);
    console.log(`[stabilify] Collected ${files.length} file(s) to upload`);

    // Phase 2 & 3: Nur wenn Dateien vorhanden sind
    if (files.length > 0) {
      // Signierte URLs holen
      const { uploadUrls, tenantId, expiresAt } = await this.getUploadUrls(
        files
      );
      console.log(
        `[stabilify] Received upload URLs for tenant: ${tenantId} (expires: ${expiresAt})`
      );

      // Dateien hochladen
      const uploadedCount = await this.uploadFiles(files, uploadUrls);
      console.log(`[stabilify] Successfully uploaded ${uploadedCount} file(s)`);
    } else {
      console.log("[stabilify] No files to upload, skipping upload phase");
    }

    // Phase 4: Failures an Server senden
    const result = await this.submitFailures(reportId, failures);
    console.log(
      `[stabilify] ✅ Upload flow completed successfully for report ${reportId}`
    );

    return result;
  }
}
