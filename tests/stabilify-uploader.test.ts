/**
 * Unit-Tests für StabilifyUploader.collectFilesToUpload()
 */

import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { CollectedFailure } from "../src/self-healing-reporter";
import type { FileToUpload } from "../src/uploader/stabilify-uploader";
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

describe("StabilifyUploader.getUploadUrls()", () => {
  let uploader: StabilifyUploader;
  const mockApiKey = "sk_test_123456";
  const mockEndpoint = "https://api.test.stabilify.dev";

  beforeEach(() => {
    uploader = new StabilifyUploader({
      apiKey: mockApiKey,
      endpoint: mockEndpoint,
    });

    // Mock fetch global
    globalThis.fetch = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("sollte signierte URLs vom Server anfordern und zurückgeben", async () => {
    const files: FileToUpload[] = [
      {
        testId: "test-1",
        localPath: "/path/to/screenshot.png",
        fileName: "screenshot.png",
        contentType: "image/png",
        fileType: "screenshot",
      },
      {
        testId: "test-1",
        localPath: "/path/to/trace.zip",
        fileName: "trace.zip",
        contentType: "application/zip",
        fileType: "trace",
      },
    ];

    const mockResponse = {
      success: true,
      tenantId: "tenant-123",
      uploadUrls: [
        {
          testId: "test-1",
          fileName: "screenshot.png",
          uploadUrl: "https://storage.googleapis.com/signed-url-1",
          destination: "gs://bucket/tenant-123/test-1/screenshot.png",
        },
        {
          testId: "test-1",
          fileName: "trace.zip",
          uploadUrl: "https://storage.googleapis.com/signed-url-2",
          destination: "gs://bucket/tenant-123/test-1/trace.zip",
        },
      ],
      expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
    };

    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    });

    const result = await uploader.getUploadUrls(files);

    expect(result).toEqual(mockResponse);
    expect(globalThis.fetch).toHaveBeenCalledWith(`${mockEndpoint}/getUploadUrls`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": mockApiKey,
      },
      body: JSON.stringify({
        files: [
          {
            testId: "test-1",
            fileName: "screenshot.png",
            contentType: "image/png",
            fileType: "screenshot",
          },
          {
            testId: "test-1",
            fileName: "trace.zip",
            contentType: "application/zip",
            fileType: "trace",
          },
        ],
      }),
    });
  });

  it("sollte einen Fehler werfen bei HTTP-Fehler", async () => {
    const files: FileToUpload[] = [
      {
        testId: "test-1",
        localPath: "/path/to/screenshot.png",
        fileName: "screenshot.png",
        contentType: "image/png",
        fileType: "screenshot",
      },
    ];

    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: false,
      status: 401,
      text: async () => "Unauthorized",
    });

    await expect(uploader.getUploadUrls(files)).rejects.toThrow(
      "Failed to get upload URLs (401): Unauthorized"
    );
  });

  it("sollte einen Fehler werfen bei ungültiger Response", async () => {
    const files: FileToUpload[] = [
      {
        testId: "test-1",
        localPath: "/path/to/screenshot.png",
        fileName: "screenshot.png",
        contentType: "image/png",
        fileType: "screenshot",
      },
    ];

    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: false }), // Ungültige Response
    });

    await expect(uploader.getUploadUrls(files)).rejects.toThrow(
      "Invalid response from getUploadUrls endpoint"
    );
  });
});

describe("StabilifyUploader.uploadFiles()", () => {
  let uploader: StabilifyUploader;
  let tempDir: string;
  let testFile: string;

  beforeEach(() => {
    uploader = new StabilifyUploader({
      apiKey: "test-api-key",
      endpoint: "https://test.example.com",
    });

    // Temporäres Verzeichnis und Testdatei erstellen
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "stabilify-upload-test-"));
    testFile = path.join(tempDir, "test-screenshot.png");
    fs.writeFileSync(testFile, "fake-png-data");

    // Mock fetch global
    globalThis.fetch = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();

    // Temporäres Verzeichnis aufräumen
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it("sollte Dateien erfolgreich hochladen", async () => {
    const files: FileToUpload[] = [
      {
        testId: "test-1",
        localPath: testFile,
        fileName: "test-screenshot.png",
        contentType: "image/png",
        fileType: "screenshot",
      },
    ];

    const uploadUrls = [
      {
        testId: "test-1",
        fileName: "test-screenshot.png",
        uploadUrl: "https://storage.googleapis.com/signed-url",
        destination: "gs://bucket/tenant/test-1/test-screenshot.png",
      },
    ];

    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
    });

    const successCount = await uploader.uploadFiles(files, uploadUrls);

    expect(successCount).toBe(1);
    expect(globalThis.fetch).toHaveBeenCalledWith(
      "https://storage.googleapis.com/signed-url",
      {
        method: "PUT",
        headers: {
          "Content-Type": "image/png",
        },
        body: expect.any(Buffer),
      }
    );
  });

  it("sollte nicht existierende Dateien überspringen", async () => {
    const files: FileToUpload[] = [
      {
        testId: "test-1",
        localPath: "/non/existent/file.png",
        fileName: "file.png",
        contentType: "image/png",
        fileType: "screenshot",
      },
    ];

    const uploadUrls = [
      {
        testId: "test-1",
        fileName: "file.png",
        uploadUrl: "https://storage.googleapis.com/signed-url",
        destination: "gs://bucket/tenant/test-1/file.png",
      },
    ];

    const successCount = await uploader.uploadFiles(files, uploadUrls);

    expect(successCount).toBe(0);
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it("sollte Fehler beim Upload loggen und fortfahren", async () => {
    const files: FileToUpload[] = [
      {
        testId: "test-1",
        localPath: testFile,
        fileName: "test-screenshot.png",
        contentType: "image/png",
        fileType: "screenshot",
      },
    ];

    const uploadUrls = [
      {
        testId: "test-1",
        fileName: "test-screenshot.png",
        uploadUrl: "https://storage.googleapis.com/signed-url",
        destination: "gs://bucket/tenant/test-1/test-screenshot.png",
      },
    ];

    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: false,
      status: 403,
      text: async () => "Forbidden",
    });

    const successCount = await uploader.uploadFiles(files, uploadUrls);

    expect(successCount).toBe(0);
  });

  it("sollte mehrere Dateien parallel hochladen", async () => {
    const testFile2 = path.join(tempDir, "test-trace.zip");
    fs.writeFileSync(testFile2, "fake-zip-data");

    const files: FileToUpload[] = [
      {
        testId: "test-1",
        localPath: testFile,
        fileName: "test-screenshot.png",
        contentType: "image/png",
        fileType: "screenshot",
      },
      {
        testId: "test-1",
        localPath: testFile2,
        fileName: "test-trace.zip",
        contentType: "application/zip",
        fileType: "trace",
      },
    ];

    const uploadUrls = [
      {
        testId: "test-1",
        fileName: "test-screenshot.png",
        uploadUrl: "https://storage.googleapis.com/signed-url-1",
        destination: "gs://bucket/tenant/test-1/test-screenshot.png",
      },
      {
        testId: "test-1",
        fileName: "test-trace.zip",
        uploadUrl: "https://storage.googleapis.com/signed-url-2",
        destination: "gs://bucket/tenant/test-1/test-trace.zip",
      },
    ];

    (globalThis.fetch as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({ ok: true })
      .mockResolvedValueOnce({ ok: true });

    const successCount = await uploader.uploadFiles(files, uploadUrls);

    expect(successCount).toBe(2);
    expect(globalThis.fetch).toHaveBeenCalledTimes(2);
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
