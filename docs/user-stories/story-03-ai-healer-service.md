# User Story 3: AI Healer Service mit GPT-4o Vision Integration

## Beschreibung

**WHO:** Als Test-Automatisierungs-System

**WHAT:** Möchte ich eine kognitive Engine implementieren, die fehlgeschlagene Selektoren mittels GPT-4o Vision und AI Snapshots analysiert und neue, valide Selektoren generiert

**WHY:** Damit Tests sich selbst heilen können, wenn UI-Elemente ihre technischen Identifikatoren ändern, aber ihre visuelle und semantische Funktion beibehalten

---

## Akzeptanzkriterien

### 1. AIHealer-Klasse Implementation
- Eine `AIHealer`-Klasse ist implementiert mit einer `heal()`-Methode
- Die Methode akzeptiert: `page: Page`, `failedSelector: string`, `error: Error`
- Die Methode gibt zurück: `Promise<string | null>` (neuer Selektor oder null bei Fehler)
- OpenAI Client ist korrekt initialisiert (API-Key aus Umgebungsvariable)

### 2. Screenshot-Erfassung
- Screenshots werden in JPEG-Format mit 60% Qualität erstellt (Performance-Optimierung)
- Screenshots werden als Base64-String kodiert für API-Übertragung
- Fehlerbehandlung bei Screenshot-Fehlern ist implementiert

### 3. AI Snapshot-Erfassung
- `page._snapshotForAI()` wird aufgerufen, um YAML-Snapshot mit ref-ids zu erhalten
- Fallback-Mechanismus für ältere Playwright-Versionen ohne `_snapshotForAI()` ist implementiert
- AI Snapshot wird in den Prompt integriert

### 4. Prompt Engineering
- Ein strukturierter Prompt ist implementiert mit folgenden Komponenten:
  - Rollenbeschreibung ("Du bist ein Experte für Testautomatisierung und Playwright")
  - Problemstellung (fehlgeschlagener Selektor)
  - Aufgabe (Element-Identifikation basierend auf Intent)
  - Ausgabeformat (strikter JSON oder reiner Selektor-String)
- Der Prompt nutzt sowohl Screenshot als auch AI Snapshot (YAML mit ref-ids)
- Der Prompt priorisiert robuste Selektoren (data-testid, role, text über CSS-Klassen)

### 5. OpenAI API Integration
- GPT-4o Vision Model wird korrekt aufgerufen
- Request enthält:
  - System-Prompt mit Rollenbeschreibung
  - User-Prompt mit Kontext (fehlgeschlagener Selektor, AI Snapshot)
  - Screenshot als Image-Input (base64)
- Response-Parsing extrahiert den Selektor korrekt
- Fehlerbehandlung für API-Fehler (Rate Limits, Timeouts, ungültige Responses)

### 6. Selektor-Validierung
- Der von der AI generierte Selektor wird syntaktisch validiert
- Ungültige Selektoren werden abgelehnt (return null)
- Logging der AI-Antwort für Debugging

### 7. Integration mit Proxy-Interceptor
- Der `AIHealer` wird im Proxy-Interceptor (Story 1) aufgerufen, wenn Basis-Retry fehlschlägt
- Der neue Selektor wird verwendet, um einen frischen Locator zu erstellen
- Die ursprüngliche Aktion wird mit dem neuen Locator wiederholt

---

## Definition of Done

- [ ] `AIHealer`-Klasse ist vollständig implementiert
- [ ] OpenAI API-Integration funktioniert mit GPT-4o Vision
- [ ] Screenshot- und AI Snapshot-Erfassung sind implementiert
- [ ] Prompt Engineering ist optimiert und dokumentiert
- [ ] Unit-Tests für Selektor-Parsing und Validierung (min. 80% Coverage)
- [ ] Integration-Tests mit Mock-OpenAI-Responses
- [ ] End-to-End-Test mit echter OpenAI API (optional, manuell)
- [ ] Fehlerbehandlung für alle API-Fehlerszenarien
- [ ] Umgebungsvariable `OPENAI_API_KEY` ist dokumentiert
- [ ] Code-Review durch mindestens 1 Senior Engineer
- [ ] Technische Dokumentation inkl. Prompt-Beispiele
- [ ] Kosten-Monitoring für API-Calls ist implementiert (Logging)

