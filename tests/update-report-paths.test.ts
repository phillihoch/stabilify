/**
 * Test für updateReportPaths Funktionalität
 */

import { describe, expect, it } from "vitest";
import type { StabilifyTestReport } from "../src/types/stabilify-report";
import type { UploadUrlInfo } from "../src/uploader/stabilify-uploader";
import { StabilifyUploader } from "../src/uploader/stabilify-uploader";

describe("StabilifyUploader.updateReportPaths()", () => {
  it("sollte Attachment-Pfade von lokalen Pfaden zu Storage-Pfaden aktualisieren", () => {
    const uploader = new StabilifyUploader({
      apiKey: "test-key",
    });

    const report: StabilifyTestReport = {
      reportFormat: "CTRF",
      specVersion: "0.0.0",
      reportId: "report-123",
      timestamp: "2024-01-01T00:00:00.000Z",
      generatedBy: "stabilify-reporter",
      results: {
        tool: { name: "playwright" },
        summary: {
          tests: 1,
          passed: 0,
          failed: 1,
          skipped: 0,
          pending: 0,
          other: 0,
          start: 0,
          stop: 0,
          extra: {
            flakyCount: 0,
            totalRetries: 0,
            durationMs: 0,
          },
        },
        tests: [
          {
            name: "test 1",
            status: "failed",
            duration: 100,
            start: 0,
            stop: 100,
            attachments: [
              {
                name: "screenshot",
                contentType: "image/png",
                path: "/local/path/screenshot.png",
              },
            ],
            extra: {
              testId: "test-1",
              projectName: "chromium",
              location: { line: 1, column: 1 },
              errorContext: {
                storagePath: "/local/path/error-context.md",
                content: "error content",
              },
            },
          },
        ],
        extra: {
          ciMetadata: {},
          stabilify: {
            reporterVersion: "1.0.0",
          },
        },
      },
    };

    const uploadUrls: UploadUrlInfo[] = [
      {
        testId: "test-1",
        fileName: "screenshot.png",
        uploadUrl: "https://storage.googleapis.com/signed-url-1",
        destination: "gs://bucket/tenant-123/report-123/test-1/screenshot.png",
        requiredHeaders: {},
      },
      {
        testId: "test-1",
        fileName: "error-context.md",
        uploadUrl: "https://storage.googleapis.com/signed-url-2",
        destination:
          "gs://bucket/tenant-123/report-123/test-1/error-context.md",
        requiredHeaders: {},
      },
    ];

    // @ts-expect-error - accessing private method for testing
    uploader.updateReportPaths(report, uploadUrls);

    // Prüfe dass Attachment-Pfad aktualisiert wurde
    expect(report.results.tests[0].attachments![0].path).toBe(
      "gs://bucket/tenant-123/report-123/test-1/screenshot.png"
    );

    // Prüfe dass Error Context Pfad aktualisiert wurde
    expect(report.results.tests[0].extra.errorContext?.storagePath).toBe(
      "gs://bucket/tenant-123/report-123/test-1/error-context.md"
    );
  });

  it("sollte [embedded] Attachments nicht ändern", () => {
    const uploader = new StabilifyUploader({
      apiKey: "test-key",
    });

    const report: StabilifyTestReport = {
      reportFormat: "CTRF",
      specVersion: "0.0.0",
      reportId: "report-456",
      timestamp: "2024-01-01T00:00:00.000Z",
      generatedBy: "stabilify-reporter",
      results: {
        tool: { name: "playwright" },
        summary: {
          tests: 1,
          passed: 1,
          failed: 0,
          skipped: 0,
          pending: 0,
          other: 0,
          start: 0,
          stop: 0,
          extra: {
            flakyCount: 0,
            totalRetries: 0,
            durationMs: 0,
          },
        },
        tests: [
          {
            name: "test 1",
            status: "passed",
            duration: 100,
            start: 0,
            stop: 100,
            attachments: [
              {
                name: "screenshot",
                contentType: "image/png",
                path: "[embedded]",
              },
            ],
            extra: {
              testId: "test-1",
              projectName: "chromium",
              location: { line: 1, column: 1 },
            },
          },
        ],
        extra: {
          ciMetadata: {},
          stabilify: {
            reporterVersion: "1.0.0",
          },
        },
      },
    };

    const uploadUrls: UploadUrlInfo[] = [];

    // @ts-expect-error - accessing private method for testing
    uploader.updateReportPaths(report, uploadUrls);

    // Prüfe dass [embedded] nicht geändert wurde
    expect(report.results.tests[0].attachments![0].path).toBe("[embedded]");
  });
});

