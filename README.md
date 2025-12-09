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

| Option | Typ | Beschreibung |
|--------|-----|--------------|
| `outputFile` | `string` | Basis-Dateiname oder relativer Pfad für die Ausgabe |

### Umgebungsvariablen

Die Konfiguration funktioniert analog zum Playwright JSON Reporter:

| Umgebungsvariable | Beschreibung | Default |
|-------------------|--------------|---------|
| `STABILIFY_OUTPUT_DIR` | Verzeichnis für die Ausgabe. Ignoriert wenn `OUTPUT_FILE` gesetzt. | `self-healing-output` |
| `STABILIFY_OUTPUT_NAME` | Basis-Dateiname, relativ zum Output-Verzeichnis | `failures-{timestamp}.json` |
| `STABILIFY_OUTPUT_FILE` | Vollständiger Pfad. Überschreibt `OUTPUT_DIR` und `OUTPUT_NAME` | - |

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
      "file": "/path/to/tests/example.spec.ts",
      "location": { "line": 10, "column": 5 },
      "projectName": "chromium",
      "errors": [
        {
          "message": "Expected element to be visible",
          "stack": "Error: ...",
          "snippet": "await expect(page.locator('button')).toBeVisible();"
        }
      ],
      "steps": [
        { "title": "Click button", "duration": 100, "category": "pw:api" }
      ],
      "screenshots": ["/path/to/screenshot.png"],
      "traces": ["/path/to/trace.zip"],
      "videos": ["/path/to/video.webm"],
      "stdout": ["Log output"],
      "stderr": [],
      "duration": 5000,
      "retry": 0,
      "status": "failed",
      "timestamp": "2025-12-09T11:00:00.000Z"
    }
  ]
}
```

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

