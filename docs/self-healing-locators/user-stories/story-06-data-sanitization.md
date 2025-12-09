# User Story 6: Data Sanitization und Security Layer

## Beschreibung

**WHO:** Als Compliance-Officer / Security-Engineer

**WHAT:** Möchte ich sicherstellen, dass keine sensiblen Daten (PII, Credentials, Geschäftsdaten) in Screenshots oder DOM-Snapshots an externe AI-APIs übertragen werden

**WHY:** Damit wir regulatorische Anforderungen (DSGVO, HIPAA, etc.) erfüllen, Datenschutzrisiken minimieren und die Nutzung des Self-Healing-Systems in produktionsnahen Umgebungen ermöglichen

---

## Akzeptanzkriterien

### 1. PII-Erkennung und Redaction in DOM-Snapshots
- Eine `DataSanitizer`-Klasse ist implementiert
- Automatische Erkennung sensibler Felder basierend auf:
  - Attributen (`type="password"`, `autocomplete="cc-number"`, etc.)
  - Namen (`name="email"`, `name="creditcard"`, etc.)
  - ARIA-Labels (`aria-label="Social Security Number"`)
- Textinhalte und `value`-Attribute sensibler Felder werden durch `***` ersetzt
- Konfigurierbare Regex-Patterns für Custom-PII-Erkennung

### 2. Visual Masking in Screenshots
- Identifikation sensibler Bereiche im Screenshot basierend auf:
  - Bounding Boxes sensibler DOM-Elemente
  - Konfigurierbare CSS-Selektoren (z.B. `.sensitive-data`)
- Überlagerung sensibler Bereiche mit schwarzen Balken oder Blur-Effekt
- Verwendung von Canvas-API oder Sharp-Library für Bildbearbeitung

### 3. Konfigurierbare Sanitization-Regeln
- JSON-Konfigurationsdatei für Sanitization-Regeln:
  ```json
  {
    "sanitization": {
      "enabled": true,
      "piiPatterns": [
        { "type": "email", "regex": "\\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Z|a-z]{2,}\\b" },
        { "type": "creditcard", "regex": "\\b\\d{4}[\\s-]?\\d{4}[\\s-]?\\d{4}[\\s-]?\\d{4}\\b" }
      ],
      "sensitiveSelectors": [
        "input[type='password']",
        "input[name*='credit']",
        ".sensitive-data"
      ],
      "maskingMethod": "blackout"
    }
  }
  ```
- Laden der Konfiguration beim System-Start
- Validierung der Konfiguration

### 4. Audit-Logging für externe API-Calls
- Jeder API-Call an OpenAI wird geloggt mit:
  - Timestamp
  - Anonymisierter Selektor (ohne sensible Teile)
  - Screenshot-Größe (in KB)
  - Snapshot-Größe (in KB)
  - Erfolg/Fehler-Status
- Logs werden in separater Datei gespeichert (`ai-api-audit.log`)
- Logs enthalten KEINE sensiblen Daten

### 5. Opt-Out-Mechanismus
- Umgebungsvariable `DISABLE_AI_HEALING=true` deaktiviert AI-Calls komplett
- Fallback auf reine Heuristiken (Story 4)
- Klare Fehlermeldung, wenn AI benötigt wird, aber deaktiviert ist

### 6. Compliance-Dokumentation
- Dokumentation der Sanitization-Mechanismen für Compliance-Audits
- Liste der übertragenen Datentypen an externe APIs
- Datenschutz-Folgenabschätzung (DPIA) Template
- Hinweise zur DSGVO-konformen Nutzung

### 7. Validierung der Sanitization
- Unit-Tests für PII-Erkennung (min. 90% Coverage für bekannte PII-Typen)
- Visual Regression Tests für Screenshot-Masking
- Integration-Tests mit Mock-Daten (E-Mails, Kreditkarten, etc.)

---

## Definition of Done

- [ ] `DataSanitizer`-Klasse ist vollständig implementiert
- [ ] PII-Redaction in DOM-Snapshots funktioniert für Standard-PII-Typen
- [ ] Visual Masking in Screenshots ist implementiert
- [ ] Konfigurationsdatei für Sanitization-Regeln ist erstellt
- [ ] Audit-Logging für API-Calls ist implementiert
- [ ] Opt-Out-Mechanismus (`DISABLE_AI_HEALING`) funktioniert
- [ ] Unit-Tests für alle Sanitization-Mechanismen (min. 90% Coverage)
- [ ] Integration-Tests mit sensiblen Mock-Daten
- [ ] Compliance-Dokumentation ist erstellt
- [ ] Security-Review durch Security-Team
- [ ] Code-Review durch mindestens 1 Senior Engineer
- [ ] Keine sensiblen Daten in Test-Logs oder API-Audit-Logs

