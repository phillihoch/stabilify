# Text Sanitization - Praktisches Beispiel

## Vorher: Rohe Playwright-Fehlerausgabe

Wenn ein Playwright-Test fehlschlägt, enthält die Fehlerausgabe typischerweise ANSI-Codes und andere Formatierungen:

```json
{
  "timestamp": "2025-12-09T11:00:00.000Z",
  "totalFailures": 1,
  "failures": [
    {
      "testId": "abc123",
      "title": "Login › should authenticate user",
      "file": "/project/tests/login.spec.ts",
      "location": { "line": 15, "column": 5 },
      "projectName": "chromium",
      "errors": [
        {
          "message": "\u001b[31mError:\u001b[0m \u001b[1mExpected element to be visible\u001b[0m\n\n\u001b[90mCall log:\u001b[0m\n  \u001b[36m- waiting for locator('button[type=\"submit\"]')\u001b[0m   ",
          "stack": "\u001b[90m    at /project/tests/login.spec.ts:15:5\u001b[0m\n\u001b[90m    at Object.<anonymous> (/project/tests/login.spec.ts:10:1)\u001b[0m\n\n\n",
          "snippet": "\u001b[90m   13 |\u001b[0m\n\u001b[90m   14 |\u001b[0m\ttest('should authenticate user', async ({ page }) => {\n\u001b[31m > 15 |\u001b[0m\t\t\u001b[1mawait expect(page.locator('button[type=\"submit\"]')).toBeVisible();\u001b[0m   \n\u001b[90m      |\u001b[0m\t\t      \u001b[31m^\u001b[0m\n\u001b[90m   16 |\u001b[0m\t});\n\u001b[90m   17 |\u001b[0m"
        }
      ],
      "steps": [
        {
          "title": "\u001b[36mlocator.click\u001b[0m",
          "duration": 100,
          "category": "pw:api",
          "error": "\u001b[31mElement not found\u001b[0m\t"
        }
      ],
      "stdout": [
        "\u001b[32m✓\u001b[0m Navigation successful\t\t",
        "\u001b[33m⚠\u001b[0m  Warning: Slow network   "
      ],
      "stderr": [
        "\u001b[31m✗\u001b[0m Login failed\n\n\n"
      ]
    }
  ]
}
```

## Nachher: Bereinigte Ausgabe

Nach der automatischen Text-Sanitization:

```json
{
  "timestamp": "2025-12-09T11:00:00.000Z",
  "totalFailures": 1,
  "failures": [
    {
      "testId": "abc123",
      "title": "Login › should authenticate user",
      "file": "/project/tests/login.spec.ts",
      "location": { "line": 15, "column": 5 },
      "projectName": "chromium",
      "errors": [
        {
          "message": "Error: Expected element to be visible\n\nCall log:\n  - waiting for locator('button[type=\"submit\"]')",
          "stack": "    at /project/tests/login.spec.ts:15:5\n    at Object.<anonymous> (/project/tests/login.spec.ts:10:1)",
          "snippet": "   13 |\n   14 |  test('should authenticate user', async ({ page }) => {\n > 15 |    await expect(page.locator('button[type=\"submit\"]')).toBeVisible();\n      |          ^\n   16 |  });\n   17 |"
        }
      ],
      "steps": [
        {
          "title": "locator.click",
          "duration": 100,
          "category": "pw:api",
          "error": "Element not found"
        }
      ],
      "stdout": [
        "✓ Navigation successful",
        "⚠  Warning: Slow network"
      ],
      "stderr": [
        "✗ Login failed"
      ]
    }
  ]
}
```

## Vergleich der Änderungen

### 1. Error Message

**Vorher:**
```
\u001b[31mError:\u001b[0m \u001b[1mExpected element to be visible\u001b[0m\n\n\u001b[90mCall log:\u001b[0m\n  \u001b[36m- waiting for locator('button[type=\"submit\"]')\u001b[0m   
```

**Nachher:**
```
Error: Expected element to be visible\n\nCall log:\n  - waiting for locator('button[type=\"submit\"]')
```

**Änderungen:**
- ✅ ANSI-Codes entfernt (`\u001b[31m`, `\u001b[0m`, etc.)
- ✅ Trailing Whitespace entfernt

### 2. Stack Trace

**Vorher:**
```
\u001b[90m    at /project/tests/login.spec.ts:15:5\u001b[0m\n\u001b[90m    at Object.<anonymous> (/project/tests/login.spec.ts:10:1)\u001b[0m\n\n\n
```

**Nachher:**
```
    at /project/tests/login.spec.ts:15:5\n    at Object.<anonymous> (/project/tests/login.spec.ts:10:1)
```

**Änderungen:**
- ✅ ANSI-Codes entfernt
- ✅ Mehrfache Leerzeilen auf eine reduziert

### 3. Code Snippet

**Vorher:**
```
\u001b[90m   13 |\u001b[0m\n\u001b[90m   14 |\u001b[0m\ttest('should authenticate user', async ({ page }) => {\n\u001b[31m > 15 |\u001b[0m\t\t\u001b[1mawait expect(page.locator('button[type=\"submit\"]')).toBeVisible();\u001b[0m   \n\u001b[90m      |\u001b[0m\t\t      \u001b[31m^\u001b[0m\n\u001b[90m   16 |\u001b[0m\t});\n\u001b[90m   17 |\u001b[0m
```

**Nachher:**
```
   13 |\n   14 |  test('should authenticate user', async ({ page }) => {\n > 15 |    await expect(page.locator('button[type=\"submit\"]')).toBeVisible();\n      |          ^\n   16 |  });\n   17 |
```

**Änderungen:**
- ✅ ANSI-Codes entfernt
- ✅ Tabs in Spaces umgewandelt (2 Spaces)
- ✅ Trailing Whitespace entfernt

### 4. Steps

**Vorher:**
```json
{
  "title": "\u001b[36mlocator.click\u001b[0m",
  "error": "\u001b[31mElement not found\u001b[0m\t"
}
```

**Nachher:**
```json
{
  "title": "locator.click",
  "error": "Element not found"
}
```

### 5. Console Output

**Vorher:**
```json
{
  "stdout": [
    "\u001b[32m✓\u001b[0m Navigation successful\t\t",
    "\u001b[33m⚠\u001b[0m  Warning: Slow network   "
  ]
}
```

**Nachher:**
```json
{
  "stdout": [
    "✓ Navigation successful",
    "⚠  Warning: Slow network"
  ]
}
```

## Vorteile für KI-Verarbeitung

### Token-Reduktion

**Vorher:** ~450 Tokens (mit ANSI-Codes)
**Nachher:** ~280 Tokens (bereinigt)
**Ersparnis:** ~38% weniger Tokens

### Bessere Lesbarkeit

Die KI kann sich auf den **Inhalt** konzentrieren, ohne durch Formatierungs-Codes abgelenkt zu werden:

- Klare Fehlermeldungen
- Saubere Stack Traces
- Lesbare Code-Snippets
- Konsistente Formatierung

### Einfachere Pattern-Erkennung

Ohne ANSI-Codes kann die KI besser:
- Fehlertypen identifizieren
- Code-Muster erkennen
- Ähnliche Fehler gruppieren
- Lösungsvorschläge generieren

## Verwendung in der Praxis

Die Sanitization erfolgt **automatisch** - keine Konfiguration erforderlich:

```typescript
// playwright.config.ts
export default defineConfig({
  reporter: [
    ['stabilify/reporter', { outputFile: 'failures.json' }]
  ]
});
```

Alle Fehlerausgaben werden automatisch bereinigt und in `failures.json` gespeichert.

