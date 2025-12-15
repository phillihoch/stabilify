/**
 * Tests für FileCollector
 */

import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { StabilifyTestReport } from "../src/types/stabilify-report";
import { FileCollector } from "../src/uploader/file-collector";

describe("FileCollector", () => {
  let collector: FileCollector;
  let tempDir: string;
  let testFiles: {
    screenshot1: string;
    trace1: string;
    video1: string;
  };

  beforeEach(() => {
    collector = new FileCollector();

    // Temporäres Verzeichnis erstellen
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "file-collector-test-"));

    // Test-Dateien erstellen
    testFiles = {
      screenshot1: path.join(tempDir, "screenshot-1.png"),
      trace1: path.join(tempDir, "trace.zip"),
      video1: path.join(tempDir, "video.webm"),
    };

    fs.writeFileSync(testFiles.screenshot1, "fake-png-data");
    fs.writeFileSync(testFiles.trace1, "fake-zip-data");
    fs.writeFileSync(testFiles.video1, "fake-video-data");
  });

  afterEach(() => {
    // Temporäres Verzeichnis aufräumen
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it("sollte nur Dateien von fehlgeschlagenen Tests sammeln", () => {
    const report: StabilifyTestReport = {
      reportFormat: "CTRF",
      specVersion: "0.0.0",
      reportId: "report-123",
      timestamp: "2024-01-01T00:00:00.000Z",
      generatedBy: "stabilify-reporter",
      results: {
        tool: { name: "playwright" },
        summary: {
          tests: 2,
          passed: 1,
          failed: 1,
          skipped: 0,
          pending: 0,
          other: 0,
          start: 0,
          stop: 0,
          extra: { flakyCount: 0, totalRetries: 0, durationMs: 0 },
        },
        tests: [
          {
            name: "failed test",
            status: "failed",
            duration: 100,
            start: 0,
            stop: 100,
            attachments: [
              {
                name: "screenshot",
                contentType: "image/png",
                path: testFiles.screenshot1,
              },
              {
                name: "trace",
                contentType: "application/zip",
                path: testFiles.trace1,
              },
            ],
            extra: {
              testId: "test-1",
              projectName: "chromium",
              location: { line: 1, column: 1 },
            },
          },
          {
            name: "passed test",
            status: "passed",
            duration: 100,
            start: 0,
            stop: 100,
            attachments: [
              {
                name: "video",
                contentType: "video/webm",
                path: testFiles.video1,
              },
            ],
            extra: {
              testId: "test-2",
              projectName: "chromium",
              location: { line: 1, column: 1 },
            },
          },
        ],
        extra: {
          ciMetadata: {},
          stabilify: { reporterVersion: "1.0.0" },
        },
      },
    };

    const files = collector.collect(report);

    // Nur Dateien vom fehlgeschlagenen Test sollten gesammelt werden
    expect(files).toHaveLength(2);
    expect(files.every((f) => f.testId === "test-1")).toBe(true);
    expect(files.find((f) => f.fileType === "screenshot")).toBeDefined();
    expect(files.find((f) => f.fileType === "trace")).toBeDefined();
    expect(files.find((f) => f.fileType === "video")).toBeUndefined();
  });

  it("sollte ein leeres Array zurückgeben wenn alle Tests erfolgreich sind", () => {
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
          extra: { flakyCount: 0, totalRetries: 0, durationMs: 0 },
        },
        tests: [
          {
            name: "passed test",
            status: "passed",
            duration: 100,
            start: 0,
            stop: 100,
            attachments: [
              {
                name: "trace",
                contentType: "application/zip",
                path: testFiles.trace1,
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
          stabilify: { reporterVersion: "1.0.0" },
        },
      },
    };

    const files = collector.collect(report);

    // Keine Dateien sollten gesammelt werden, da alle Tests erfolgreich sind
    expect(files).toHaveLength(0);
  });

  it("sollte embedded Attachments überspringen", () => {
    const report: StabilifyTestReport = {
      reportFormat: "CTRF",
      specVersion: "0.0.0",
      reportId: "report-789",
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
          extra: { flakyCount: 0, totalRetries: 0, durationMs: 0 },
        },
        tests: [
          {
            name: "failed test",
            status: "failed",
            duration: 100,
            start: 0,
            stop: 100,
            attachments: [
              {
                name: "screenshot",
                contentType: "image/png",
                path: "[embedded]",
              },
              {
                name: "trace",
                contentType: "application/zip",
                path: testFiles.trace1,
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
          stabilify: { reporterVersion: "1.0.0" },
        },
      },
    };

    const files = collector.collect(report);

    // Nur die trace-Datei sollte gesammelt werden, embedded screenshot wird übersprungen
    expect(files).toHaveLength(1);
    expect(files[0].fileType).toBe("trace");
  });

  it("sollte nicht existierende Dateien überspringen", () => {
    const nonExistentPath = path.join(tempDir, "does-not-exist.png");

    const report: StabilifyTestReport = {
      reportFormat: "CTRF",
      specVersion: "0.0.0",
      reportId: "report-999",
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
          extra: { flakyCount: 0, totalRetries: 0, durationMs: 0 },
        },
        tests: [
          {
            name: "failed test",
            status: "failed",
            duration: 100,
            start: 0,
            stop: 100,
            attachments: [
              {
                name: "screenshot",
                contentType: "image/png",
                path: nonExistentPath,
              },
              {
                name: "trace",
                contentType: "application/zip",
                path: testFiles.trace1,
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
          stabilify: { reporterVersion: "1.0.0" },
        },
      },
    };

    const files = collector.collect(report);

    // Nur die existierende trace-Datei sollte gesammelt werden
    expect(files).toHaveLength(1);
    expect(files[0].localPath).toBe(testFiles.trace1);
  });
});
