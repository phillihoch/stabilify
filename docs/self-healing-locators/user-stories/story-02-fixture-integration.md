# User Story 2: Custom Fixture Integration für transparente Nutzung

## Beschreibung

**WHO:** Als Test-Entwickler

**WHAT:** Möchte ich den Proxy-Interceptor über Playwright Fixtures global aktivieren können

**WHY:** Damit alle Tests automatisch Self-Healing-Fähigkeiten erhalten, ohne dass ich jeden einzelnen Test manuell anpassen muss

---

## Akzeptanzkriterien

### 1. Playwright Test Extension
- Eine Custom Fixture-Datei (`fixtures.ts`) ist erstellt
- Das Standard-`test`-Objekt wird mittels `test.extend()` erweitert
- Die `page`-Fixture wird überschrieben und gibt eine Proxy-wrapped Page zurück
- Export eines erweiterten `test`-Objekts für die Nutzung in Tests

### 2. Page-Locator-Methoden Wrapping
- Alle Locator-erzeugenden Methoden der Page werden wrapped:
  - `page.locator()`
  - `page.getByRole()`
  - `page.getByText()`
  - `page.getByLabel()`
  - `page.getByPlaceholder()`
  - `page.getByAltText()`
  - `page.getByTitle()`
  - `page.getByTestId()`
- Jede dieser Methoden gibt einen Proxy-wrapped Locator zurück (aus Story 1)

### 3. Abwärtskompatibilität
- Bestehende Tests funktionieren ohne Code-Änderungen
- Tests können weiterhin `import { test, expect } from '@playwright/test'` nutzen oder auf `import { test, expect } from './fixtures'` umstellen
- Beide Import-Varianten sind dokumentiert

### 4. Konfigurierbarkeit
- Self-Healing kann über eine Umgebungsvariable aktiviert/deaktiviert werden (`ENABLE_SELF_HEALING=true/false`)
- Im deaktivierten Zustand wird die Standard-Page ohne Proxy zurückgegeben
- Konfiguration ist über `playwright.config.ts` steuerbar

### 5. Fixture-Lifecycle
- Die Fixture nutzt korrekt `async ({ page }, use) => { ... }` Pattern
- Cleanup-Logik ist implementiert (falls erforderlich)
- Keine Memory Leaks durch Proxy-Referenzen

---

## Definition of Done

- [ ] `fixtures.ts` ist implementiert und exportiert erweiterte `test` und `expect` Objekte
- [ ] Alle Page-Locator-Methoden sind korrekt wrapped
- [ ] Umgebungsvariable `ENABLE_SELF_HEALING` ist implementiert und getestet
- [ ] Mindestens 5 bestehende Tests wurden erfolgreich mit der neuen Fixture ausgeführt
- [ ] Dokumentation für Entwickler ist erstellt (README-Abschnitt)
- [ ] Migration-Guide für bestehende Tests ist verfügbar
- [ ] Code-Review durch mindestens 1 Engineer
- [ ] Integration-Tests zeigen keine Regression
- [ ] Performance-Vergleich (mit/ohne Fixture) zeigt < 10% Overhead

