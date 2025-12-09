# Text Sanitization

## Übersicht

Der Self-Healing Reporter bereinigt automatisch alle Textausgaben von ANSI-Codes und anderen nicht-informativen Zeichen, um die Daten KI-freundlicher zu machen.

## Motivation

Playwright-Fehlerausgaben enthalten häufig:
- **ANSI Escape Codes** für Farbformatierung (`\u001b[31m`, `\u001b[90m`, etc.)
- **Tabs** statt Spaces
- **Mehrfache Leerzeilen**
- **Trailing Whitespace**

Diese Formatierungen erschweren die Verarbeitung durch KI-Modelle und erhöhen die Token-Anzahl unnötig.

## Was wird bereinigt?

Die Text-Sanitization ist **standardmäßig aktiviert** und nicht konfigurierbar. Sie wendet folgende Transformationen an:

### 1. ANSI-Codes entfernen

Alle ANSI Escape Sequences werden entfernt:

```typescript
// Vorher
"\u001b[31mError:\u001b[0m Something went wrong"

// Nachher
"Error: Something went wrong"
```

### 2. Tabs normalisieren

Tabs werden in 2 Spaces umgewandelt:

```typescript
// Vorher
"function test() {\n\treturn true;\n}"

// Nachher
"function test() {\n  return true;\n}"
```

### 3. Mehrfache Leerzeilen kollabieren

Mehrere aufeinanderfolgende Leerzeilen werden auf eine reduziert:

```typescript
// Vorher
"Line 1\n\n\n\nLine 2"

// Nachher
"Line 1\n\nLine 2"
```

### 4. Trailing Whitespace entfernen

Whitespace am Zeilenende wird entfernt:

```typescript
// Vorher
"Error message   \nSecond line\t"

// Nachher
"Error message\nSecond line"
```

## Betroffene Felder

Die Sanitization wird auf folgende Felder angewendet:

### Error-Objekte
- `message` - Fehlermeldung
- `stack` - Stack Trace
- `snippet` - Code-Ausschnitt

### Step-Objekte
- `title` - Schritt-Titel
- `error` - Fehler-Nachricht

### Console-Ausgaben
- `stdout` - Standardausgabe (Array)
- `stderr` - Fehlerausgabe (Array)

## Implementierung

Die Sanitization erfolgt in der `collectFailureInfo`-Methode des Reporters:

```typescript
errors: result.errors.map((e) => ({
  message: sanitizeText(e.message || "Unknown error"),
  stack: sanitizeText(e.stack),
  snippet: sanitizeText(e.snippet),
  location: e.location,
}))
```

## Technische Details

### Verwendete Funktionen

- `sanitizeText(text)` - Bereinigt einen einzelnen String
- `sanitizeTextArray(texts)` - Bereinigt ein Array von Strings

### ANSI Regex Pattern

```typescript
const ANSI_REGEX = /\u001b\[[0-9;]*[a-zA-Z]|\u001b\][^\u0007]*\u0007|\u001b[=>]|\u009b[0-9;]*[a-zA-Z]/g;
```

Dieses Pattern matcht:
- Standard ANSI Escape Sequences (`\u001b[...m`)
- OSC Sequences (`\u001b]...`)
- CSI Sequences (`\u009b...`)

### Null/Undefined Handling

Null- und undefined-Werte werden zu leeren Strings konvertiert:

```typescript
sanitizeText(null)      // => ""
sanitizeText(undefined) // => ""
sanitizeText("")        // => ""
```

## Vorteile

1. **Bessere KI-Lesbarkeit** - Keine störenden Formatierungscodes
2. **Reduzierte Token-Anzahl** - Weniger unnötige Zeichen
3. **Konsistente Formatierung** - Einheitliche Einrückung und Zeilenumbrüche
4. **Einfachere Weiterverarbeitung** - Saubere Textdaten für Analyse-Tools

## Beispiel-Output

### Vorher (mit ANSI-Codes)

```json
{
  "errors": [
    {
      "message": "\u001b[31mError:\u001b[0m Expected element to be visible",
      "stack": "\u001b[90m  at Object.<anonymous> (/test.ts:10:5)\u001b[0m",
      "snippet": "\u001b[1mawait expect(page.locator('button')).toBeVisible();\u001b[0m"
    }
  ]
}
```

### Nachher (bereinigt)

```json
{
  "errors": [
    {
      "message": "Error: Expected element to be visible",
      "stack": "  at Object.<anonymous> (/test.ts:10:5)",
      "snippet": "await expect(page.locator('button')).toBeVisible();"
    }
  ]
}
```

## Wartbarkeit

Die Sanitization-Logik ist in einem separaten Modul (`src/utils/text-sanitizer.ts`) implementiert:

- **Modular** - Kann unabhängig getestet und erweitert werden
- **Wiederverwendbar** - Kann in anderen Teilen des Projekts genutzt werden
- **Gut getestet** - Umfassende Unit-Tests für alle Funktionen
- **Typsicher** - Vollständige TypeScript-Typisierung

## Sicherheit

Die Sanitization entfernt **nur** Formatierungsinformationen, keine Inhalte:

- ✅ ANSI-Codes werden entfernt
- ✅ Whitespace wird normalisiert
- ❌ Keine Entfernung von sensiblen Daten (siehe separate Data Sanitization)
- ❌ Keine Änderung der semantischen Bedeutung

