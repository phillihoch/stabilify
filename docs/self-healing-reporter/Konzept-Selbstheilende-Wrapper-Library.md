# Konzept: Selbstheilende Wrapper-Library für Playwright Tests

## 1. Übersicht

Diese Analyse beschreibt, wie eine Wrapper-Library implementiert werden kann, die bei Playwright-Tests "mithört", Fehler erkennt und alle relevanten Informationen für die Weiterverarbeitung (z.B. durch einen LLM) sammelt.

## 2. Architektur-Optionen

### 2.1 Option A: Custom Reporter (Empfohlen ⭐)

Der **eleganteste und minimalinvasivste Ansatz**. Playwright hat ein vollständiges Reporter-System, das alle Test-Events abfängt.

```typescript
// self-healing-reporter.ts
import type {
  Reporter,
  TestCase,
  TestResult,
  FullResult,
  FullConfig,
  Suite,
  TestError,
} from "@playwright/test/reporter";

interface FailedTestInfo {
  testTitle: string;
  testFile: string;
  testLocation: { line: number; column: number };
  errorMessage: string;
  errorStack: string;
  screenshot?: string; // Base64 oder Pfad
  trace?: string; // Trace-Datei Pfad
  steps: string[]; // Ausgeführte Schritte
  htmlSnapshot?: string; // DOM-Snapshot
  consoleOutput: string[];
  duration: number;
}

class SelfHealingReporter implements Reporter {
  private failedTests: FailedTestInfo[] = [];
  private config!: FullConfig;

  onBegin(config: FullConfig, suite: Suite): void {
    this.config = config;
  }

  onTestEnd(test: TestCase, result: TestResult): void {
    if (result.status !== "passed" && result.status !== "skipped") {
      this.collectFailureInfo(test, result);
    }
  }

  async onEnd(result: FullResult): Promise<void> {
    if (this.failedTests.length > 0) {
      await this.processFailures();
    }
  }

  private collectFailureInfo(test: TestCase, result: TestResult): void {
    const failedTest: FailedTestInfo = {
      testTitle: test.titlePath().join(" > "),
      testFile: test.location.file,
      testLocation: { line: test.location.line, column: test.location.column },
      errorMessage: result.errors.map((e) => e.message).join("\n"),
      errorStack: result.errors.map((e) => e.stack).join("\n"),
      steps: result.steps.map((s) => s.title),
      consoleOutput: [...result.stdout, ...result.stderr].map(String),
      duration: result.duration,
    };

    // Screenshots und Traces aus Attachments extrahieren
    for (const attachment of result.attachments) {
      if (attachment.contentType.startsWith("image/") && attachment.path) {
        failedTest.screenshot = attachment.path;
      }
      if (attachment.name === "trace" && attachment.path) {
        failedTest.trace = attachment.path;
      }
    }

    this.failedTests.push(failedTest);
  }

  private async processFailures(): Promise<void> {
    // Hier: Daten an LLM senden oder speichern
    console.log(JSON.stringify(this.failedTests, null, 2));
  }

  printsToStdio(): boolean {
    return false; // Playwright nutzt zusätzlich Standard-Reporter
  }
}

export default SelfHealingReporter;
```

**Einbindung in `playwright.config.ts`:**

```typescript
import { defineConfig } from "@playwright/test";

export default defineConfig({
  reporter: [
    ["list"], // Standard-Reporter
    ["./self-healing-reporter.ts"], // Unser Custom Reporter
  ],
  use: {
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
  },
});
```

**Vorteile:**

- ✅ Keine Änderung an bestehenden Tests notwendig
- ✅ Hat Zugriff auf ALLE Informationen: `TestCase`, `TestResult`, `TestError`
- ✅ Screenshots und Traces automatisch über Attachments verfügbar
- ✅ Offiziell unterstützte API
- ✅ Läuft am Ende jedes Tests

**Verfügbare Daten im `TestResult`:**
| Feld | Typ | Beschreibung |
|------|-----|--------------|
| `status` | `'passed' \| 'failed' \| 'timedOut' \| 'skipped'` | Test-Status |
| `errors` | `TestError[]` | Alle Fehler mit message, stack, location, snippet |
| `attachments` | `Attachment[]` | Screenshots, Traces, Videos |
| `steps` | `TestStep[]` | Alle ausgeführten Schritte mit Zeitstempeln |
| `stdout` | `(string\|Buffer)[]` | Konsolenausgabe |
| `stderr` | `(string\|Buffer)[]` | Fehlerausgabe |
| `duration` | `number` | Testdauer in ms |
| `retry` | `number` | Retry-Nummer |

---

### 2.2 Option B: Auto-Fixture mit Teardown

Nutzt das Fixture-System für automatische Hooks bei jedem Test:

```typescript
// fixtures.ts
import { test as base, TestInfo } from "@playwright/test";

export const test = base.extend<{ selfHealingCollector: void }>({
  selfHealingCollector: [
    async ({ page }, use, testInfo: TestInfo) => {
      // Setup: Vor dem Test
      const consoleMessages: string[] = [];
      page.on("console", (msg) => consoleMessages.push(msg.text()));

      await use(); // Test läuft hier

      // Teardown: Nach dem Test
      if (testInfo.status !== "passed" && testInfo.status !== "skipped") {
        const failureData = {
          title: testInfo.title,
          file: testInfo.file,
          errors: testInfo.errors,
          attachments: testInfo.attachments,
          consoleMessages,
          annotations: testInfo.annotations,
        };
        // Hier: Daten verarbeiten
      }
    },
    { auto: true },
  ], // auto: true = läuft bei JEDEM Test automatisch
});
```

**Vorteile:**

- ✅ Zugriff auf `page`-Objekt für zusätzliche Daten (Console, Network)
- ✅ Flexibel erweiterbar

**Nachteile:**

- ❌ Muss in alle Testdateien importiert werden
- ❌ Weniger Informationen als beim Reporter

---

### 2.3 Option C: Kombinierter Ansatz (Maximale Daten)

Kombination aus Reporter + Fixture für maximale Informationssammlung:

````
┌─────────────────────────────────────────────────────────────┐
│                    Playwright Test Runner                    │
├─────────────────────────────────────────────────────────────┤
│  ┌──────────────────────────────────────────────────────┐   │
│  │               Auto-Fixture (pro Test)                 │   │
│  │  • Sammelt Runtime-Daten: Console, Network, DOM      │   │
│  │  • Hat Zugriff auf page, context, browser            │   │
│  │  • Speichert in SharedContext/File                   │   │
│  └──────────────────────────────────────────────────────┘   │
│                            │                                 │
│                            ▼                                 │
│  ┌──────────────────────────────────────────────────────┐   │
│  │              Custom Reporter (global)                 │   │
│  │  • Erhält TestResult mit allen Attachments           │   │
│  │  • Kombiniert mit Runtime-Daten aus Fixture          │   │
│  │  • Sendet an LLM / speichert                         │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘

---

## 3. Gesammelte Daten-Struktur

```typescript
interface SelfHealingFailureData {
  // Test-Identifikation
  testId: string;
  testTitle: string;
  titlePath: string[];
  file: string;
  location: { line: number; column: number };
  projectName: string;

  // Fehler-Details
  errors: Array<{
    message: string;
    stack?: string;
    snippet?: string;      // Code-Ausschnitt um den Fehler
    location?: { file: string; line: number; column: number };
  }>;

  // Ausführungs-Kontext
  steps: Array<{
    title: string;
    duration: number;
    error?: string;
    category: 'pw:api' | 'expect' | 'test.step' | 'hook';
  }>;

  // Artefakte
  attachments: Array<{
    name: string;
    contentType: string;
    path?: string;
    body?: Buffer;
  }>;

  // Laufzeit-Daten (bei Fixture-Nutzung)
  runtime?: {
    consoleMessages: string[];
    networkRequests: Array<{ url: string; status: number; method: string }>;
    domSnapshot?: string;
    currentUrl: string;
    pageTitle: string;
  };

  // Meta-Informationen
  retry: number;
  duration: number;
  status: 'failed' | 'timedOut' | 'interrupted';
  workerIndex: number;
  timestamp: string;
}
````

---

## 4. Implementierungs-Empfehlung

### Phase 1: Minimal Viable Product (Reporter-only)

```
┌────────────────────────────────────────────────────────┐
│  playwright.config.ts                                   │
│  ├── reporter: ['./self-healing-reporter.ts']          │
│  ├── screenshot: 'only-on-failure'                     │
│  ├── trace: 'retain-on-failure'                        │
│  └── video: 'retain-on-failure' (optional)             │
└────────────────────────────────────────────────────────┘
                          │
                          ▼
┌────────────────────────────────────────────────────────┐
│  SelfHealingReporter                                    │
│  ├── onTestEnd() → Fehler erkennen & Daten sammeln    │
│  ├── onEnd() → Alle Fehler verarbeiten                 │
│  └── Output: JSON / HTTP-Webhook / File               │
└────────────────────────────────────────────────────────┘
```

### Phase 2: Enhanced mit Fixture

Erweitert um Laufzeit-Daten durch Auto-Fixture:

- Console-Logs
- Network-Requests
- DOM-Snapshots zum Fehlerzeitpunkt

### Phase 3: LLM-Integration

- Webhook an LLM-Service
- Automatische Analyse
- Vorgeschlagene Fixes zurück an Reporter

---

## 5. Wichtige Playwright-APIs

| API                  | Zweck                       | Dokumentation                                                  |
| -------------------- | --------------------------- | -------------------------------------------------------------- |
| `Reporter` Interface | Test-Events abfangen        | [Reporter API](https://playwright.dev/docs/api/class-reporter) |
| `TestResult`         | Vollständige Testergebnisse | [TestResult](https://playwright.dev/docs/api/class-testresult) |
| `TestError`          | Fehler-Details              | [TestError](https://playwright.dev/docs/api/class-testerror)   |
| `TestStep`           | Einzelne Test-Schritte      | [TestStep](https://playwright.dev/docs/api/class-teststep)     |
| `test.extend()`      | Fixtures erstellen          | [Fixtures](https://playwright.dev/docs/test-fixtures)          |

---

## 6. Code-Beispiel: Vollständiger Reporter

```typescript
// self-healing-reporter.ts
import type {
  Reporter,
  FullConfig,
  Suite,
  TestCase,
  TestResult,
  FullResult,
  TestError,
} from "@playwright/test/reporter";
import * as fs from "fs";
import * as path from "path";

interface CollectedFailure {
  testId: string;
  title: string;
  file: string;
  location: { line: number; column: number };
  projectName: string;
  errors: Array<{
    message: string;
    stack?: string;
    snippet?: string;
    location?: { file: string; line: number; column: number };
  }>;
  steps: Array<{
    title: string;
    duration: number;
    category: string;
    error?: string;
  }>;
  screenshots: string[];
  traces: string[];
  videos: string[];
  stdout: string[];
  stderr: string[];
  duration: number;
  retry: number;
  status: string;
  timestamp: string;
}

class SelfHealingReporter implements Reporter {
  private failures: CollectedFailure[] = [];
  private outputDir: string = "./self-healing-output";

  onBegin(config: FullConfig, suite: Suite): void {
    this.outputDir = config.rootDir + "/self-healing-output";
    if (!fs.existsSync(this.outputDir)) {
      fs.mkdirSync(this.outputDir, { recursive: true });
    }
  }

  onTestEnd(test: TestCase, result: TestResult): void {
    if (result.status === "passed" || result.status === "skipped") return;

    const failure: CollectedFailure = {
      testId: test.id,
      title: test.titlePath().join(" › "),
      file: test.location.file,
      location: { line: test.location.line, column: test.location.column },
      projectName: test.titlePath()[1] || "default",
      errors: result.errors.map((e) => ({
        message: e.message || "Unknown error",
        stack: e.stack,
        snippet: e.snippet,
        location: e.location,
      })),
      steps: result.steps.map((s) => ({
        title: s.title,
        duration: s.duration,
        category: s.category,
        error: s.error?.message,
      })),
      screenshots: [],
      traces: [],
      videos: [],
      stdout: result.stdout.map(String),
      stderr: result.stderr.map(String),
      duration: result.duration,
      retry: result.retry,
      status: result.status,
      timestamp: new Date().toISOString(),
    };

    // Attachments kategorisieren
    for (const attachment of result.attachments) {
      if (attachment.contentType.startsWith("image/")) {
        failure.screenshots.push(attachment.path || "[embedded]");
      } else if (attachment.name === "trace") {
        failure.traces.push(attachment.path || "[embedded]");
      } else if (attachment.contentType.startsWith("video/")) {
        failure.videos.push(attachment.path || "[embedded]");
      }
    }

    this.failures.push(failure);
  }

  async onEnd(result: FullResult): Promise<void> {
    if (this.failures.length === 0) return;

    const outputFile = path.join(this.outputDir, `failures-${Date.now()}.json`);
    fs.writeFileSync(outputFile, JSON.stringify(this.failures, null, 2));

    console.log(
      `\n📋 Self-Healing Report: ${this.failures.length} Fehler gesammelt`
    );
    console.log(`   Gespeichert in: ${outputFile}`);

    // Hier: Optional an LLM-Service senden
    // await this.sendToLLMService(this.failures);
  }

  printsToStdio(): boolean {
    return false;
  }
}

export default SelfHealingReporter;
```

---

## 7. Fazit & Empfehlung

| Ansatz              | Aufwand    | Datenmenge     | Invasivität           |
| ------------------- | ---------- | -------------- | --------------------- |
| **Custom Reporter** | 🟢 Niedrig | 🟡 Mittel-Hoch | 🟢 Keine (nur Config) |
| Auto-Fixture        | 🟡 Mittel  | 🟢 Sehr Hoch   | 🟡 Import in Tests    |
| Kombiniert          | 🔴 Hoch    | 🟢 Maximal     | 🟡 Import in Tests    |

**Empfehlung: Starte mit dem Custom Reporter-Ansatz.** Er bietet:

- Zugriff auf alle essenziellen Daten (Fehler, Screenshots, Traces, Steps)
- Keine Änderung an bestehenden Tests
- Einfache Aktivierung über `playwright.config.ts`
- Erweiterbar bei Bedarf

Die Fixture-Erweiterung kann später hinzugefügt werden, wenn zusätzliche Laufzeit-Daten (Console, Network) benötigt werden.

```

```
