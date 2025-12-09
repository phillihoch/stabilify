# User Story 5: Caching und Persistenz-Layer (Learning Memory)

## Beschreibung

**WHO:** Als Test-Automatisierungs-System

**WHAT:** Möchte ich erfolgreich geheilte Selektor-Mappings speichern und bei zukünftigen Testläufen wiederverwenden

**WHY:** Damit derselbe Fehler nicht mehrfach geheilt werden muss, die Testausführung beschleunigt wird und API-Kosten auf null reduziert werden für bereits bekannte Änderungen

---

## Akzeptanzkriterien

### 1. Runtime-Caching
- Ein In-Memory-Cache ist implementiert (z.B. `Map<string, string>`)
- Der Cache speichert Mappings: `originalSelector → healedSelector`
- Der Cache wird beim Start des Testlaufs initialisiert
- Der Cache wird vor jedem Healing-Versuch konsultiert
- Cache-Hits vermeiden sowohl Heuristiken als auch AI-Calls

### 2. Persistenz in JSON-Datei
- Eine `healing-map.json`-Datei wird im Projekt-Root oder konfigurierbaren Pfad erstellt
- Die Datei enthält strukturierte Mappings:
  ```json
  {
    "version": "1.0",
    "lastUpdated": "2025-01-15T10:30:00Z",
    "mappings": [
      {
        "originalSelector": "button[name='submit-order']",
        "healedSelector": "button[data-testid='submit-btn']",
        "healedAt": "2025-01-15T10:30:00Z",
        "healingMethod": "ai",
        "confidence": "high",
        "usageCount": 5
      }
    ]
  }
  ```
- Die Datei wird beim Start des Testlaufs geladen
- Die Datei wird nach jedem erfolgreichen Healing aktualisiert

### 3. Automatisches Laden beim Teststart
- Die Fixture (Story 2) lädt die `healing-map.json` beim Setup
- Fehlerbehandlung, wenn die Datei nicht existiert oder korrupt ist
- Logging der Anzahl geladener Mappings

### 4. Versionierung und Invalidierung
- Jedes Mapping hat einen Timestamp (`healedAt`)
- Konfigurierbare TTL (Time-To-Live) für Mappings (z.B. 30 Tage)
- Abgelaufene Mappings werden automatisch entfernt
- Manuelle Invalidierung über CLI-Command oder Umgebungsvariable (`CLEAR_HEALING_CACHE=true`)

### 5. Konfliktauflösung
- Wenn ein Mapping existiert, aber der geheilte Selektor ebenfalls fehlschlägt:
  - Das alte Mapping wird als "invalid" markiert
  - Ein neuer Healing-Versuch wird gestartet
  - Das neue Mapping ersetzt das alte
- Logging von Konflikten für Analyse

### 6. Statistiken und Reporting
- Tracking der Nutzungshäufigkeit pro Mapping (`usageCount`)
- Aggregierte Statistiken am Ende des Testlaufs:
  - Anzahl Cache-Hits
  - Anzahl neuer Heilungen
  - Anzahl invalidierter Mappings
- Export der Statistiken in separates Log-File oder Console-Output

### 7. Multi-Environment Support
- Unterstützung für unterschiedliche Mappings pro Umgebung (dev, staging, prod)
- Konfigurierbar über Umgebungsvariable `TEST_ENV`
- Separate JSON-Dateien pro Umgebung (z.B. `healing-map.dev.json`)

---

## Definition of Done

- [ ] Runtime-Cache ist implementiert und funktioniert
- [ ] `healing-map.json` wird korrekt erstellt, geladen und aktualisiert
- [ ] Versionierung und TTL-Mechanismus sind implementiert
- [ ] Konfliktauflösung funktioniert korrekt
- [ ] Statistiken werden geloggt und sind aussagekräftig
- [ ] Multi-Environment Support ist implementiert
- [ ] Unit-Tests für Cache-Logik (min. 80% Coverage)
- [ ] Integration-Tests zeigen korrektes Laden/Speichern
- [ ] Performance-Test: Cache-Hit reduziert Healing-Zeit auf < 5ms
- [ ] Dokumentation für Entwickler (Konfiguration, manuelle Invalidierung)
- [ ] Code-Review durch mindestens 1 Engineer
- [ ] `.gitignore` ist aktualisiert (optional: `healing-map.json` ignorieren oder committen)

