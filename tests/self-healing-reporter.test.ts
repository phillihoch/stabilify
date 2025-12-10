import type {
  FullConfig,
  FullResult,
  Suite,
  TestCase,
  TestResult,
} from "@playwright/test/reporter";
import * as fs from "node:fs";
import * as path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SelfHealingReporter } from "../src/self-healing-reporter";

// Mock fs module
vi.mock("fs", () => ({
  existsSync: vi.fn(),
  mkdirSync: vi.fn(),
  writeFileSync: vi.fn(),
  readFileSync: vi.fn(),
}));

// Umgebungsvariablen zurücksetzen nach jedem Test
const originalEnv = { ...process.env };

/**
 * Erstellt eine Mock FullConfig
 */
function createMockConfig(rootDir: string = "/test/project"): FullConfig {
  return {
    rootDir,
    configFile: "/test/project/playwright.config.ts",
    projects: [],
    version: "1.0.0",
    reporter: [],
    workers: 1,
    globalSetup: null,
    globalTeardown: null,
    globalTimeout: 0,
    grep: /.*/,
    grepInvert: null,
    maxFailures: 0,
    metadata: {},
    preserveOutput: "always",
    quiet: false,
    shard: null,
    updateSnapshots: "missing",
    updateSourceMethod: "patch",
    webServer: null,
    forbidOnly: false,
    fullyParallel: false,
    ignoreSnapshots: false,
    reportSlowTests: null,
    respectGitIgnore: true,
    testIdAttribute: "data-testid",
  } as FullConfig;
}

/**
 * Erstellt einen Mock TestCase
 */
function createMockTestCase(overrides: Partial<TestCase> = {}): TestCase {
  return {
    id: "test-123",
    title: "should work",
    titlePath: () => ["tests", "example.spec.ts", "should work"],
    location: {
      file: "/test/project/tests/example.spec.ts",
      line: 10,
      column: 5,
    },
    parent: {} as Suite,
    annotations: [],
    expectedStatus: "passed",
    ok: () => true,
    outcome: () => "expected",
    repeatEachIndex: 0,
    results: [],
    retries: 0,
    tags: [],
    timeout: 30000,
    ...overrides,
  } as TestCase;
}

/**
 * Erstellt ein Mock TestResult
 */
function createMockTestResult(
  status: "passed" | "failed" | "timedOut" | "skipped" = "failed",
  overrides: Partial<TestResult> = {}
): TestResult {
  return {
    status,
    duration: 1000,
    errors:
      status === "failed"
        ? [{ message: "Test failed", stack: "Error stack" }]
        : [],
    attachments: [],
    steps: [
      {
        title: "Click button",
        duration: 100,
        category: "test.step",
        steps: [],
      },
      {
        title: "Expect visible",
        duration: 50,
        category: "test.step",
        steps: [],
      },
    ],
    stdout: ["Log output"],
    stderr: [],
    retry: 0,
    parallelIndex: 0,
    workerIndex: 0,
    startTime: new Date(),
    ...overrides,
  } as unknown as TestResult;
}

describe("SelfHealingReporter", () => {
  let reporter: SelfHealingReporter;

  beforeEach(() => {
    // Standard-Reporter mit configDir für Tests
    reporter = new SelfHealingReporter({ configDir: "/test/project" });
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
    // Umgebungsvariablen zurücksetzen
    process.env = { ...originalEnv };
  });

  describe("onBegin", () => {
    it("sollte nichts machen (Verzeichnis wird erst bei writeReport erstellt)", () => {
      const testReporter = new SelfHealingReporter({
        configDir: "/test/project",
      });
      const config = createMockConfig("/test/project");

      testReporter.onBegin(config, {} as Suite);

      // onBegin erstellt keine Verzeichnisse mehr
      expect(fs.mkdirSync).not.toHaveBeenCalled();
    });
  });

  describe("onTestEnd", () => {
    beforeEach(() => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      reporter.onBegin(createMockConfig(), {} as Suite);
    });

    it("sollte keine Daten sammeln bei bestandenen Tests", () => {
      const testCase = createMockTestCase();
      const result = createMockTestResult("passed");

      reporter.onTestEnd(testCase, result);

      expect(reporter.getFailures()).toHaveLength(0);
    });

    it("sollte keine Daten sammeln bei übersprungenen Tests", () => {
      const testCase = createMockTestCase();
      const result = createMockTestResult("skipped");

      reporter.onTestEnd(testCase, result);

      expect(reporter.getFailures()).toHaveLength(0);
    });

    it("sollte Fehlerdaten bei fehlgeschlagenen Tests sammeln", () => {
      const testCase = createMockTestCase();
      const result = createMockTestResult("failed");

      reporter.onTestEnd(testCase, result);

      const failures = reporter.getFailures();
      expect(failures).toHaveLength(1);
      expect(failures[0].status).toBe("failed");
      expect(failures[0].testId).toBe("test-123");
    });

    it("sollte Fehlerdaten bei Timeout-Tests sammeln", () => {
      const testCase = createMockTestCase();
      const result = createMockTestResult("timedOut");

      reporter.onTestEnd(testCase, result);

      const failures = reporter.getFailures();
      expect(failures).toHaveLength(1);
      expect(failures[0].status).toBe("timedOut");
    });
  });

  describe("onEnd", () => {
    beforeEach(() => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      reporter.onBegin(createMockConfig(), {} as Suite);
    });

    it("sollte auch ohne Fehler eine Datei mit leerem failures-Array schreiben", async () => {
      await reporter.onEnd({ status: "passed" } as FullResult);

      expect(fs.writeFileSync).toHaveBeenCalled();
      const call = vi.mocked(fs.writeFileSync).mock.calls[0];
      const content = call[1] as string;
      const parsed = JSON.parse(content);
      expect(parsed.totalFailures).toBe(0);
      expect(parsed.failures).toEqual([]);
    });

    it("sollte eine JSON-Datei schreiben wenn Fehler vorliegen", async () => {
      const testCase = createMockTestCase();
      const result = createMockTestResult("failed");

      reporter.onTestEnd(testCase, result);
      await reporter.onEnd({ status: "failed" } as FullResult);

      expect(fs.writeFileSync).toHaveBeenCalled();
      const call = vi.mocked(fs.writeFileSync).mock.calls[0];
      const filePath = call[0] as string;
      expect(filePath).toContain("failures-");
      expect(filePath).toContain(".json");

      // Prüfe, dass valides JSON geschrieben wurde
      const content = call[1] as string;
      const parsed = JSON.parse(content);
      expect(parsed.totalFailures).toBe(1);
      expect(parsed.failures).toHaveLength(1);
    });

    it("sollte auch bei erfolgreichen Tests eine Datei schreiben", async () => {
      await reporter.onEnd({ status: "passed" } as FullResult);

      expect(fs.writeFileSync).toHaveBeenCalled();
      const call = vi.mocked(fs.writeFileSync).mock.calls[0];
      const content = call[1] as string;
      const parsed = JSON.parse(content);
      expect(parsed.totalFailures).toBe(0);
      expect(parsed.failures).toHaveLength(0);
    });
  });

  describe("printsToStdio", () => {
    it("sollte false zurückgeben", () => {
      expect(reporter.printsToStdio()).toBe(false);
    });
  });

  describe("Attachment-Kategorisierung", () => {
    beforeEach(() => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      reporter.onBegin(createMockConfig(), {} as Suite);
    });

    it("sollte Screenshots korrekt kategorisieren", () => {
      const testCase = createMockTestCase();
      const result = createMockTestResult("failed", {
        attachments: [
          {
            name: "screenshot",
            contentType: "image/png",
            path: "/path/to/screenshot.png",
          },
        ],
      });

      reporter.onTestEnd(testCase, result);

      const failures = reporter.getFailures();
      expect(failures[0].screenshots).toContain("/path/to/screenshot.png");
    });

    it("sollte Traces korrekt kategorisieren", () => {
      const testCase = createMockTestCase();
      const result = createMockTestResult("failed", {
        attachments: [
          {
            name: "trace",
            contentType: "application/zip",
            path: "/path/to/trace.zip",
          },
        ],
      });

      reporter.onTestEnd(testCase, result);

      const failures = reporter.getFailures();
      expect(failures[0].traces).toContain("/path/to/trace.zip");
    });

    it("sollte Videos korrekt kategorisieren", () => {
      const testCase = createMockTestCase();
      const result = createMockTestResult("failed", {
        attachments: [
          {
            name: "video",
            contentType: "video/webm",
            path: "/path/to/video.webm",
          },
        ],
      });

      reporter.onTestEnd(testCase, result);

      const failures = reporter.getFailures();
      expect(failures[0].videos).toContain("/path/to/video.webm");
    });

    it("sollte Error-Context korrekt extrahieren", () => {
      const testCase = createMockTestCase();
      const errorContextContent = `# Page snapshot

\`\`\`yaml
- document [ref=s1]:
  - heading "Welcome" [level=1]
  - button "Submit" [ref=s2]
\`\`\``;

      // Mock fs.readFileSync für error-context Datei
      vi.mocked(fs.readFileSync).mockReturnValueOnce(errorContextContent);

      const result = createMockTestResult("failed", {
        attachments: [
          {
            name: "error-context",
            contentType: "text/markdown",
            path: "/path/to/error-context.md",
          },
        ],
      });

      reporter.onTestEnd(testCase, result);

      const failures = reporter.getFailures();
      expect(failures[0].errorContext).toBeDefined();
      expect(failures[0].errorContext?.path).toBe("/path/to/error-context.md");
      expect(failures[0].errorContext?.content).toContain("Page snapshot");
      expect(failures[0].errorContext?.content).toContain('button "Submit"');
    });

    it("sollte Error-Context mit embedded body verarbeiten", () => {
      const testCase = createMockTestCase();
      const errorContextContent = `# Page snapshot

\`\`\`yaml
- document [ref=s1]:
  - heading "Test" [level=1]
\`\`\``;

      const result = createMockTestResult("failed", {
        attachments: [
          {
            name: "error-context",
            contentType: "text/markdown",
            body: Buffer.from(errorContextContent),
          },
        ],
      });

      reporter.onTestEnd(testCase, result);

      const failures = reporter.getFailures();
      expect(failures[0].errorContext).toBeDefined();
      expect(failures[0].errorContext?.path).toBe("[embedded]");
      expect(failures[0].errorContext?.content).toContain("Page snapshot");
    });
  });

  describe("CollectedFailure Datenstruktur", () => {
    beforeEach(() => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      reporter.onBegin(createMockConfig(), {} as Suite);
    });

    it("sollte alle Felder korrekt erfassen", () => {
      const testCase = createMockTestCase();
      const result = createMockTestResult("failed");

      reporter.onTestEnd(testCase, result);

      const failure = reporter.getFailures()[0];

      // Pflichtfelder prüfen
      expect(failure.testId).toBe("test-123");
      expect(failure.title).toBe("tests › example.spec.ts › should work");
      expect(failure.file).toBe("/test/project/tests/example.spec.ts");
      expect(failure.location).toEqual({ line: 10, column: 5 });
      expect(failure.projectName).toBe("example.spec.ts");
      expect(failure.errors).toHaveLength(1);
      expect(failure.steps).toHaveLength(2);
      expect(failure.duration).toBe(1000);
      expect(failure.retry).toBe(0);
      expect(failure.status).toBe("failed");
      expect(failure.timestamp).toBeDefined();
    });
  });

  describe("Output-Pfad Auflösung", () => {
    it("sollte configDir als Basis-Verzeichnis verwenden", () => {
      const testReporter = new SelfHealingReporter({
        configDir: "/my/project",
      });

      const outputPath = testReporter.getOutputPath();

      expect(outputPath).toContain("/my/project/self-healing-output/");
      expect(outputPath).toContain("failures-");
    });

    it("sollte outputFile Option als Dateiname verwenden (ohne Pfad)", () => {
      const testReporter = new SelfHealingReporter({
        configDir: "/my/project",
        outputFile: "my-failures.json",
      });

      expect(testReporter.getOutputPath()).toBe(
        path.join("/my/project", "self-healing-output", "my-failures.json")
      );
    });

    it("sollte outputFile Option mit Pfad direkt relativ zu configDir verwenden", () => {
      const testReporter = new SelfHealingReporter({
        configDir: "/my/project",
        outputFile: "playwright-results/stabilify.json",
      });

      expect(testReporter.getOutputPath()).toBe(
        path.join("/my/project", "playwright-results/stabilify.json")
      );
    });

    it("sollte STABILIFY_OUTPUT_DIR Umgebungsvariable verwenden", () => {
      process.env.STABILIFY_OUTPUT_DIR = "custom-output";
      const testReporter = new SelfHealingReporter({
        configDir: "/my/project",
      });

      const outputPath = testReporter.getOutputPath();

      expect(outputPath).toContain("/my/project/custom-output/");
    });

    it("sollte STABILIFY_OUTPUT_NAME Umgebungsvariable verwenden", () => {
      process.env.STABILIFY_OUTPUT_NAME = "env-failures.json";
      const testReporter = new SelfHealingReporter({
        configDir: "/my/project",
      });

      expect(testReporter.getOutputPath()).toBe(
        path.join("/my/project", "self-healing-output", "env-failures.json")
      );
    });

    it("sollte STABILIFY_OUTPUT_FILE Umgebungsvariable mit höchster Priorität verwenden", () => {
      process.env.STABILIFY_OUTPUT_FILE = "/absolute/path/report.json";
      process.env.STABILIFY_OUTPUT_DIR = "ignored";
      process.env.STABILIFY_OUTPUT_NAME = "ignored.json";
      const testReporter = new SelfHealingReporter({
        configDir: "/my/project",
        outputFile: "also-ignored.json",
      });

      expect(testReporter.getOutputPath()).toBe("/absolute/path/report.json");
    });

    it("sollte relativen STABILIFY_OUTPUT_FILE Pfad relativ zu configDir auflösen", () => {
      process.env.STABILIFY_OUTPUT_FILE = "relative/path/report.json";
      const testReporter = new SelfHealingReporter({
        configDir: "/my/project",
      });

      expect(testReporter.getOutputPath()).toBe(
        path.join("/my/project", "relative/path/report.json")
      );
    });

    it("sollte outputFile Option vor STABILIFY_OUTPUT_NAME priorisieren", () => {
      process.env.STABILIFY_OUTPUT_NAME = "env-name.json";
      const testReporter = new SelfHealingReporter({
        configDir: "/my/project",
        outputFile: "option-name.json",
      });

      expect(testReporter.getOutputPath()).toBe(
        path.join("/my/project", "self-healing-output", "option-name.json")
      );
    });
  });

  describe("Report schreiben", () => {
    it("sollte Verzeichnis erstellen wenn es nicht existiert", async () => {
      vi.mocked(fs.existsSync).mockReturnValue(false);
      const testReporter = new SelfHealingReporter({
        configDir: "/my/project",
        outputFile: "test.json",
      });

      await testReporter.onEnd({ status: "passed" } as FullResult);

      expect(fs.mkdirSync).toHaveBeenCalledWith(
        path.join("/my/project", "self-healing-output"),
        { recursive: true }
      );
    });

    it("sollte Datei mit korrektem Inhalt schreiben", async () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      const testReporter = new SelfHealingReporter({
        configDir: "/my/project",
        outputFile: "test.json",
      });

      testReporter.onTestEnd(
        createMockTestCase(),
        createMockTestResult("failed")
      );
      await testReporter.onEnd({ status: "failed" } as FullResult);

      const call = vi.mocked(fs.writeFileSync).mock.calls[0];
      const filePath = call[0] as string;
      const content = JSON.parse(call[1] as string);

      expect(filePath).toBe(
        path.join("/my/project", "self-healing-output", "test.json")
      );
      expect(content.totalFailures).toBe(1);
      expect(content.failures).toHaveLength(1);
    });
  });

  describe("Raw Text Output", () => {
    it("sollte Fehlermeldungen unverändert speichern", () => {
      const testReporter = new SelfHealingReporter();
      testReporter.onBegin(createMockConfig(), {} as Suite);

      const testCase = createMockTestCase();
      const testResult = createMockTestResult("failed", {
        errors: [
          {
            message: "\u001b[31mError:\u001b[0m Expected element to be visible",
            stack: "\u001b[90mStack trace\u001b[0m",
            snippet: "\u001b[1mawait expect(page).toBeVisible();\u001b[0m",
          },
        ],
      });

      testReporter.onTestEnd(testCase, testResult);
      const failures = testReporter.getFailures();

      expect(failures).toHaveLength(1);
      expect(failures[0].errors[0].message).toBe(
        "\u001b[31mError:\u001b[0m Expected element to be visible"
      );
      expect(failures[0].errors[0].stack).toBe(
        "\u001b[90mStack trace\u001b[0m"
      );
      expect(failures[0].errors[0].snippet).toBe(
        "\u001b[1mawait expect(page).toBeVisible();\u001b[0m"
      );
    });

    it("sollte stdout/stderr unverändert speichern", () => {
      const testReporter = new SelfHealingReporter();
      testReporter.onBegin(createMockConfig(), {} as Suite);

      const testCase = createMockTestCase();
      const testResult = createMockTestResult("failed", {
        stdout: ["\u001b[32mSuccess message\u001b[0m"],
        stderr: ["\u001b[31mError message\u001b[0m"],
      });

      testReporter.onTestEnd(testCase, testResult);
      const failures = testReporter.getFailures();

      expect(failures).toHaveLength(1);
      expect(failures[0].stdout).toEqual([
        "\u001b[32mSuccess message\u001b[0m",
      ]);
      expect(failures[0].stderr).toEqual(["\u001b[31mError message\u001b[0m"]);
    });

    it("sollte null/undefined Werte korrekt behandeln", () => {
      const testReporter = new SelfHealingReporter();
      testReporter.onBegin(createMockConfig(), {} as Suite);

      const testCase = createMockTestCase();
      const testResult = createMockTestResult("failed", {
        errors: [
          {
            message: "Error",
            stack: undefined,
            snippet: undefined,
          },
        ],
      });

      testReporter.onTestEnd(testCase, testResult);
      const failures = testReporter.getFailures();

      expect(failures[0].errors[0].message).toBe("Error");
      expect(failures[0].errors[0].stack).toBeUndefined();
      expect(failures[0].errors[0].snippet).toBeUndefined();
    });
  });

  describe("CTRF-inspirierte Features", () => {
    beforeEach(() => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
    });

    describe("Suite-Pfad", () => {
      it("sollte den Suite-Pfad korrekt aufbauen", () => {
        const parentSuite: Partial<Suite> = {
          title: "Parent Suite",
          parent: undefined,
        };
        const childSuite: Partial<Suite> = {
          title: "Child Suite",
          parent: parentSuite as Suite,
        };
        const testCase = createMockTestCase({
          parent: childSuite as Suite,
        });

        const testReporter = new SelfHealingReporter({
          configDir: "/test/project",
        });
        testReporter.onTestEnd(testCase, createMockTestResult("failed"));

        const failure = testReporter.getFailures()[0];
        expect(failure.suite).toBe("Parent Suite > Child Suite");
      });
    });

    describe("Flaky-Detection", () => {
      it("sollte flaky als false setzen bei fehlgeschlagenen Tests", () => {
        const testReporter = new SelfHealingReporter({
          configDir: "/test/project",
        });
        const testCase = createMockTestCase();
        const testResult = createMockTestResult("failed");

        testReporter.onTestEnd(testCase, testResult);

        const failure = testReporter.getFailures()[0];
        expect(failure.flaky).toBe(false);
      });
    });

    describe("Retry-Attempts", () => {
      it("sollte vorherige fehlgeschlagene Versuche sammeln", () => {
        const failedResult1: Partial<TestResult> = {
          status: "failed",
          duration: 1000,
          errors: [{ message: "First error", stack: "Stack 1" }],
          steps: [],
          attachments: [],
          stdout: [],
          stderr: [],
          retry: 0,
        };
        const failedResult2: Partial<TestResult> = {
          status: "failed",
          duration: 2000,
          errors: [{ message: "Second error", stack: "Stack 2" }],
          steps: [],
          attachments: [],
          stdout: [],
          stderr: [],
          retry: 1,
        };
        const currentResult: Partial<TestResult> = {
          status: "failed",
          duration: 3000,
          errors: [{ message: "Final error", stack: "Stack 3" }],
          steps: [],
          attachments: [],
          stdout: [],
          stderr: [],
          retry: 2,
        };

        const testCase = createMockTestCase({
          results: [
            failedResult1 as TestResult,
            failedResult2 as TestResult,
            currentResult as TestResult,
          ],
        });

        const testReporter = new SelfHealingReporter({
          configDir: "/test/project",
        });
        testReporter.onTestEnd(testCase, currentResult as TestResult);

        const failure = testReporter.getFailures()[0];
        expect(failure.retryAttempts).toHaveLength(2);
        expect(failure.retryAttempts?.[0].message).toBe("First error");
        expect(failure.retryAttempts?.[0].duration).toBe(1000);
        expect(failure.retryAttempts?.[1].message).toBe("Second error");
        expect(failure.retryAttempts?.[1].duration).toBe(2000);
      });

      it("sollte keine retryAttempts bei erstem Versuch haben", () => {
        const testReporter = new SelfHealingReporter({
          configDir: "/test/project",
        });
        const testCase = createMockTestCase({ results: [] });
        const testResult = createMockTestResult("failed");

        testReporter.onTestEnd(testCase, testResult);

        const failure = testReporter.getFailures()[0];
        expect(failure.retryAttempts).toBeUndefined();
      });
    });

    describe("Browser-Info Extraktion", () => {
      it("sollte Browser-Info aus metadata.json extrahieren", () => {
        const metadata = { name: "chromium", version: "120.0.0" };
        const testResult = createMockTestResult("failed", {
          attachments: [
            {
              name: "metadata.json",
              contentType: "application/json",
              body: Buffer.from(JSON.stringify(metadata)),
            },
          ],
        });

        const testReporter = new SelfHealingReporter({
          configDir: "/test/project",
        });
        testReporter.onTestEnd(createMockTestCase(), testResult);

        const failure = testReporter.getFailures()[0];
        expect(failure.browser).toBe("chromium 120.0.0");
      });

      it("sollte undefined zurückgeben wenn keine metadata.json vorhanden", () => {
        const testReporter = new SelfHealingReporter({
          configDir: "/test/project",
        });
        testReporter.onTestEnd(
          createMockTestCase(),
          createMockTestResult("failed")
        );

        const failure = testReporter.getFailures()[0];
        expect(failure.browser).toBeUndefined();
      });
    });

    describe("Steps mit Status", () => {
      it("sollte Steps mit passed Status verarbeiten", () => {
        const testResult = createMockTestResult("failed", {
          steps: [
            {
              title: "Step 1",
              duration: 100,
              category: "test.step",
              steps: [],
            },
            {
              title: "Step 2",
              duration: 200,
              category: "test.step",
              steps: [],
            },
          ],
        });

        const testReporter = new SelfHealingReporter({
          configDir: "/test/project",
        });
        testReporter.onTestEnd(createMockTestCase(), testResult);

        const failure = testReporter.getFailures()[0];
        expect(failure.steps).toHaveLength(2);
        expect(failure.steps[0].status).toBe("passed");
        expect(failure.steps[0].name).toBe("Step 1");
        expect(failure.steps[1].status).toBe("passed");
      });

      it("sollte Steps mit failed Status bei Fehler markieren", () => {
        const testResult = createMockTestResult("failed", {
          steps: [
            {
              title: "Step 1",
              duration: 100,
              category: "test.step",
              error: { message: "Step failed" },
              steps: [],
            },
          ],
        });

        const testReporter = new SelfHealingReporter({
          configDir: "/test/project",
        });
        testReporter.onTestEnd(createMockTestCase(), testResult);

        const failure = testReporter.getFailures()[0];
        expect(failure.steps[0].status).toBe("failed");
        expect(failure.steps[0].error).toBe("Step failed");
      });

      it("sollte nur test.step Kategorien verarbeiten", () => {
        const testResult = createMockTestResult("failed", {
          steps: [
            { title: "API call", duration: 100, category: "pw:api", steps: [] },
            {
              title: "Test Step",
              duration: 200,
              category: "test.step",
              steps: [],
            },
            { title: "Expect", duration: 50, category: "expect", steps: [] },
          ],
        });

        const testReporter = new SelfHealingReporter({
          configDir: "/test/project",
        });
        testReporter.onTestEnd(createMockTestCase(), testResult);

        const failure = testReporter.getFailures()[0];
        expect(failure.steps).toHaveLength(1);
        expect(failure.steps[0].name).toBe("Test Step");
      });
    });

    describe("Environment-Optionen", () => {
      it("sollte Environment-Informationen auf Report-Ebene speichern (verschachtelt)", async () => {
        const environment = {
          appName: "MyApp",
          appVersion: "1.0.0",
          branchName: "main",
          commit: "abc123",
          testEnvironment: "staging",
        };

        const testReporter = new SelfHealingReporter({
          configDir: "/test/project",
          environment,
          outputFile: "test.json",
        });
        await testReporter.onEnd({ status: "passed" } as FullResult);

        const call = vi.mocked(fs.writeFileSync).mock.calls[0];
        const content = JSON.parse(call[1] as string);
        expect(content.environment).toEqual(environment);
      });

      it("sollte flache Environment-Optionen akzeptieren", async () => {
        const testReporter = new SelfHealingReporter({
          configDir: "/test/project",
          appName: "MyApp",
          appVersion: "1.0.0",
          branchName: "main",
          outputFile: "test.json",
        });
        await testReporter.onEnd({ status: "passed" } as FullResult);

        const call = vi.mocked(fs.writeFileSync).mock.calls[0];
        const content = JSON.parse(call[1] as string);
        expect(content.environment).toEqual({
          appName: "MyApp",
          appVersion: "1.0.0",
          branchName: "main",
        });
      });

      it("sollte leeres Environment nicht im Report speichern", async () => {
        const testReporter = new SelfHealingReporter({
          configDir: "/test/project",
          outputFile: "test.json",
        });
        await testReporter.onEnd({ status: "passed" } as FullResult);

        const call = vi.mocked(fs.writeFileSync).mock.calls[0];
        const content = JSON.parse(call[1] as string);
        expect(content.environment).toBeUndefined();
      });
    });

    describe("Neue Felder", () => {
      it("sollte rawStatus setzen", () => {
        const testReporter = new SelfHealingReporter({
          configDir: "/test/project",
        });
        testReporter.onTestEnd(
          createMockTestCase(),
          createMockTestResult("timedOut")
        );

        const failure = testReporter.getFailures()[0];
        expect(failure.rawStatus).toBe("timedOut");
      });
    });
  });
});
