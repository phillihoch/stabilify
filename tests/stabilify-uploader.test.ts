/**
 * Unit-Tests für StabilifyUploader.collectFilesToUpload()
 */

import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { CollectedFailure } from "../src/self-healing-reporter";
import { StabilifyUploader } from "../src/uploader/stabilify-uploader";

describe("StabilifyUploader.collectFilesToUpload()", () => {
  let uploader: StabilifyUploader;
  let tempDir: string;
  let testFiles: {
    screenshot1: string;
    screenshot2: string;
    trace1: string;
    video1: string;
  };

  beforeEach(() => {
    // Uploader-Instanz erstellen
    uploader = new StabilifyUploader({
      apiKey: "test-api-key",
      endpoint: "https://test.example.com",
    });

    // Temporäres Verzeichnis für Testdateien erstellen
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "stabilify-test-"));

    // Testdateien erstellen
    testFiles = {
      screenshot1: path.join(tempDir, "screenshot-1.png"),
      screenshot2: path.join(tempDir, "screenshot-2.png"),
      trace1: path.join(tempDir, "trace.zip"),
      video1: path.join(tempDir, "video.webm"),
    };

    // Dateien mit Dummy-Inhalt erstellen
    fs.writeFileSync(testFiles.screenshot1, "fake-png-data");
    fs.writeFileSync(testFiles.screenshot2, "fake-png-data");
    fs.writeFileSync(testFiles.trace1, "fake-zip-data");
    fs.writeFileSync(testFiles.video1, "fake-webm-data");
  });

  afterEach(() => {
    // Temporäres Verzeichnis aufräumen
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it("sollte alle existierenden Dateien aus einem Failure sammeln", () => {
    const failures: CollectedFailure[] = [
      createMockFailure("test-1", {
        screenshots: [testFiles.screenshot1, testFiles.screenshot2],
        traces: [testFiles.trace1],
        videos: [testFiles.video1],
      }),
    ];

    const result = uploader.collectFilesToUpload(failures);

    expect(result).toHaveLength(4);

    // Screenshots prüfen
    const screenshots = result.filter((f) => f.fileType === "screenshot");
    expect(screenshots).toHaveLength(2);
    expect(screenshots[0]).toMatchObject({
      testId: "test-1",
      localPath: testFiles.screenshot1,
      fileName: "screenshot-1.png",
      contentType: "image/png",
      fileType: "screenshot",
    });

    // Traces prüfen
    const traces = result.filter((f) => f.fileType === "trace");
    expect(traces).toHaveLength(1);
    expect(traces[0]).toMatchObject({
      testId: "test-1",
      localPath: testFiles.trace1,
      fileName: "trace.zip",
      contentType: "application/zip",
      fileType: "trace",
    });

    // Videos prüfen
    const videos = result.filter((f) => f.fileType === "video");
    expect(videos).toHaveLength(1);
    expect(videos[0]).toMatchObject({
      testId: "test-1",
      localPath: testFiles.video1,
      fileName: "video.webm",
      contentType: "video/webm",
      fileType: "video",
    });
  });

  it("sollte nicht existierende Dateien überspringen", () => {
    const nonExistentPath = path.join(tempDir, "does-not-exist.png");

    const failures: CollectedFailure[] = [
      createMockFailure("test-2", {
        screenshots: [testFiles.screenshot1, nonExistentPath],
        traces: [],
        videos: [],
      }),
    ];

    const result = uploader.collectFilesToUpload(failures);

    // Nur die existierende Datei sollte gesammelt werden
    expect(result).toHaveLength(1);
    expect(result[0].localPath).toBe(testFiles.screenshot1);
  });

  it("sollte ein leeres Array zurückgeben bei leeren Failure-Arrays", () => {
    const result = uploader.collectFilesToUpload([]);

    expect(result).toEqual([]);
  });

  it("sollte ein leeres Array zurückgeben wenn keine Dateien vorhanden sind", () => {
    const failures: CollectedFailure[] = [
      createMockFailure("test-3", {
        screenshots: [],
        traces: [],
        videos: [],
      }),
    ];

    const result = uploader.collectFilesToUpload(failures);

    expect(result).toEqual([]);
  });

  it("sollte embedded Dateien ([embedded]) überspringen", () => {
    const failures: CollectedFailure[] = [
      createMockFailure("test-4", {
        screenshots: ["[embedded]", testFiles.screenshot1],
        traces: ["[embedded]"],
        videos: ["[embedded]"],
      }),
    ];

    const result = uploader.collectFilesToUpload(failures);

    // Nur die echte Datei sollte gesammelt werden
    expect(result).toHaveLength(1);
    expect(result[0].localPath).toBe(testFiles.screenshot1);
  });

  it("sollte gemischte Szenarien korrekt verarbeiten (mehrere Failures, teilweise existierende Dateien)", () => {
    const nonExistentPath1 = path.join(tempDir, "missing-1.png");
    const nonExistentPath2 = path.join(tempDir, "missing-2.zip");

    const failures: CollectedFailure[] = [
      // Failure 1: Alle Dateien existieren
      createMockFailure("test-5a", {
        screenshots: [testFiles.screenshot1],
        traces: [testFiles.trace1],
        videos: [],
      }),
      // Failure 2: Gemischt (einige existieren, andere nicht)
      createMockFailure("test-5b", {
        screenshots: [nonExistentPath1, testFiles.screenshot2],
        traces: [nonExistentPath2],
        videos: [testFiles.video1],
      }),
      // Failure 3: Keine Dateien
      createMockFailure("test-5c", {
        screenshots: [],
        traces: [],
        videos: [],
      }),
    ];

    const result = uploader.collectFilesToUpload(failures);

    // Sollte 4 Dateien sammeln (screenshot1, trace1, screenshot2, video1)
    expect(result).toHaveLength(4);

    // Prüfe dass die richtigen testIds zugeordnet sind
    const test5aFiles = result.filter((f) => f.testId === "test-5a");
    expect(test5aFiles).toHaveLength(2); // screenshot1, trace1

    const test5bFiles = result.filter((f) => f.testId === "test-5b");
    expect(test5bFiles).toHaveLength(2); // screenshot2, video1

    const test5cFiles = result.filter((f) => f.testId === "test-5c");
    expect(test5cFiles).toHaveLength(0); // keine Dateien
  });
});

/**
 * Hilfsfunktion zum Erstellen eines Mock-Failure-Objekts
 */
function createMockFailure(
  testId: string,
  files: {
    screenshots: string[];
    traces: string[];
    videos: string[];
  }
): CollectedFailure {
  return {
    reportId: "test-report-id",
    testId,
    title: "Test Title",
    file: "/path/to/test.spec.ts",
    location: { line: 1, column: 1 },
    projectName: "test-project",
    suite: "Test Suite",
    errors: [],
    steps: [],
    retry: 0,
    flaky: false,
    screenshots: files.screenshots,
    traces: files.traces,
    videos: files.videos,
    stdout: [],
    stderr: [],
    duration: 1000,
    status: "failed",
    timestamp: new Date().toISOString(),
  } as CollectedFailure;
}
