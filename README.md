# Stabilify

Ein Self-Healing Reporter für Playwright, der fehlgeschlagene Tests analysiert und alle relevanten Informationen für die Weiterverarbeitung sammelt.

## Installation

```bash
npm install stabilify
```

## Verwendung

Füge den Reporter in deiner `playwright.config.ts` hinzu:

```typescript
import { defineConfig } from "@playwright/test";

export default defineConfig({
  reporter: [
    ["list"],
    ["stabilify/reporter", { outputFile: "stabilify.json" }],
  ],
  use: {
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
  },
});
```

## Konfiguration

### Reporter-Optionen

| Option        | Typ                 | Beschreibung                                        |
| ------------- | ------------------- | --------------------------------------------------- |
| `outputFile`  | `string`            | Basis-Dateiname oder relativer Pfad für die Ausgabe |
| `environment` | `ReportEnvironment` | Umgebungsinformationen für den Report (siehe unten) |

### Environment-Optionen

Du kannst zusätzliche Kontextinformationen über die Testumgebung mitgeben:

```typescript
export default defineConfig({
  reporter: [
    ["list"],
    [
      "stabilify/reporter",
      {
        outputFile: "stabilify.json",
        environment: {
          appName: "MyApp",
          appVersion: "1.0.0",
          buildName: "CI Build #123",
          buildNumber: "123",
          buildUrl: "https://ci.example.com/builds/123",
          repositoryName: "my-org/my-repo",
          repositoryUrl: "https://github.com/my-org/my-repo",
          branchName: "main",
          commit: "abc123def",
          testEnvironment: "staging",
        },
      },
    ],
  ],
});
```

Alle Environment-Felder sind optional:

| Feld              | Beschreibung                      |
| ----------------- | --------------------------------- |
| `appName`         | Name der Anwendung                |
| `appVersion`      | Version der Anwendung             |
| `osPlatform`      | Betriebssystem-Plattform          |
| `osRelease`       | Betriebssystem-Release            |
| `osVersion`       | Betriebssystem-Version            |
| `buildName`       | Name des CI-Builds                |
| `buildNumber`     | Nummer des CI-Builds              |
| `buildUrl`        | URL zum CI-Build                  |
| `repositoryName`  | Name des Repositories             |
| `repositoryUrl`   | URL zum Repository                |
| `branchName`      | Git-Branch                        |
| `commit`          | Git-Commit-Hash                   |
| `testEnvironment` | Testumgebung (z.B. staging, prod) |

### Umgebungsvariablen

Die Konfiguration funktioniert analog zum Playwright JSON Reporter:

| Umgebungsvariable       | Beschreibung                                                       | Default                     |
| ----------------------- | ------------------------------------------------------------------ | --------------------------- |
| `STABILIFY_OUTPUT_DIR`  | Verzeichnis für die Ausgabe. Ignoriert wenn `OUTPUT_FILE` gesetzt. | `self-healing-output`       |
| `STABILIFY_OUTPUT_NAME` | Basis-Dateiname, relativ zum Output-Verzeichnis                    | `failures-{timestamp}.json` |
| `STABILIFY_OUTPUT_FILE` | Vollständiger Pfad. Überschreibt `OUTPUT_DIR` und `OUTPUT_NAME`    | -                           |

### Priorität

1. `STABILIFY_OUTPUT_FILE` (vollständiger Pfad) - höchste Priorität
2. `outputFile` Option + `STABILIFY_OUTPUT_DIR`
3. `STABILIFY_OUTPUT_NAME` + `STABILIFY_OUTPUT_DIR`
4. Default: `{configDir}/self-healing-output/failures-{timestamp}.json`

## Beispiele

### Mit Config-Option

```typescript
["stabilify/reporter", { outputFile: "my-report.json" }],
```

Ausgabe: `{projekt}/self-healing-output/my-report.json`

### Mit Umgebungsvariable

```bash
STABILIFY_OUTPUT_FILE=playwright-results/stabilify.json npx playwright test
```

Ausgabe: `{projekt}/playwright-results/stabilify.json`

### Nur Verzeichnis ändern

```bash
STABILIFY_OUTPUT_DIR=my-reports npx playwright test
```

Ausgabe: `{projekt}/my-reports/failures-{timestamp}.json`

## Output-Format

Der Reporter erstellt eine JSON-Datei mit folgendem Format:

```json
{
  "timestamp": "2025-12-09T11:00:00.000Z",
  "totalFailures": 1,
  "failures": [
    {
      "testId": "abc123",
      "title": "tests › example.spec.ts › should work",
      "suite": "Login Tests > Authentication",
      "file": "/path/to/tests/example.spec.ts",
      "location": { "line": 10, "column": 5 },
      "projectName": "chromium",
      "browser": "chromium 120.0.0",
      "flaky": false,
      "rawStatus": "failed",
      "errors": [
        {
          "message": "Expected element to be visible",
          "stack": "Error: ...",
          "snippet": "await expect(page.locator('button')).toBeVisible();"
        }
      ],
      "steps": [
        {
          "name": "Click login button",
          "status": "passed",
          "duration": 100,
          "category": "test.step"
        },
        {
          "name": "Verify dashboard",
          "status": "failed",
          "duration": 50,
          "category": "test.step",
          "error": "Element not found"
        }
      ],
      "retryAttempts": [
        {
          "status": "failed",
          "duration": 4500,
          "message": "Timeout waiting for element",
          "trace": "Error: Timeout..."
        }
      ],
      "screenshots": ["/path/to/screenshot.png"],
      "traces": ["/path/to/trace.zip"],
      "videos": ["/path/to/video.webm"],
      "stdout": ["Log output"],
      "stderr": [],
      "duration": 5000,
      "retry": 1,
      "status": "failed",
      "timestamp": "2025-12-09T11:00:00.000Z",
      "environment": {
        "appName": "MyApp",
        "branchName": "main",
        "commit": "abc123"
      }
    }
  ]
}
```

### Neue Felder (CTRF-inspiriert)

| Feld             | Typ       | Beschreibung                                              |
| ---------------- | --------- | --------------------------------------------------------- |
| `suite`          | `string`  | Hierarchischer Suite-Pfad (z.B. "Parent > Child")         |
| `browser`        | `string`  | Browser-Name und Version                                  |
| `flaky`          | `boolean` | `true` wenn Test nach Retries bestanden hat               |
| `rawStatus`      | `string`  | Originaler Playwright-Status (`failed`, `timedOut`, etc.) |
| `retryAttempts`  | `array`   | Details aller vorherigen fehlgeschlagenen Versuche        |
| `steps[].status` | `string`  | Status jedes Steps (`passed` oder `failed`)               |
| `steps[].error`  | `string`  | Fehlermeldung wenn Step fehlgeschlagen                    |
| `environment`    | `object`  | Konfigurierte Umgebungsinformationen                      |

## Entwicklung

```bash
# Dependencies installieren
npm install

# Tests ausführen
npm test

# Build erstellen
npm run build

# Für lokale Entwicklung in anderem Projekt
npm link
# Im anderen Projekt:
npm link stabilify
```

## Lizenz

MIT
