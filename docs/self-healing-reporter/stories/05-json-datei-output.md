# Story 05: JSON-Datei-Output mit strukturiertem Format

**Phase:** MVP  
**Priorität:** Hoch  
**Abhängigkeiten:** Story 02, 03, 04 (Datensammlung)

---

## Beschreibung

**WHO:** Als QA-Engineer, Entwickler oder DevOps-Engineer

**WHAT:** Möchte ich, dass alle gesammelten Fehlerinformationen am Ende des Testlaufs in einer strukturierten JSON-Datei gespeichert werden

**WHY:** Damit ich die Fehlerdaten maschinell weiterverarbeiten, archivieren oder an andere Tools (z.B. CI/CD-Pipeline, Analyse-Tools) übergeben kann

---

## Akzeptanzkriterien (Confirmation)

- [ ] Am Ende des Testlaufs wird eine JSON-Datei im Output-Verzeichnis erstellt
- [ ] Der Dateiname enthält einen Zeitstempel: `failures-{timestamp}.json`
- [ ] Die JSON-Datei enthält ein Array aller gesammelten Fehler
- [ ] Das JSON ist formatiert (Pretty Print mit 2 Spaces Einrückung)
- [ ] Bei 0 Fehlern wird keine Datei erstellt
- [ ] Eine Zusammenfassung wird in der Konsole ausgegeben:
  - Anzahl der gesammelten Fehler
  - Pfad zur gespeicherten Datei
- [ ] Die JSON-Struktur entspricht dem definierten Schema (validierbar)

---

## INVEST-Check

| Kriterium | Erfüllt | Begründung |
|-----------|---------|------------|
| **Independent** – Kann die Story eigenständig umgesetzt werden? | ⚠️ Teilweise | Benötigt gesammelte Daten aus vorherigen Stories |
| **Negotiable** – Gibt es Raum für Diskussion und Anpassungen? | ✅ Ja | Dateiname-Format, Speicherort anpassbar |
| **Valuable** – Liefert die Story einen klaren Nutzen für den Benutzer? | ✅ Ja | Ermöglicht Persistierung und Weiterverarbeitung |
| **Estimable** – Kann der Aufwand vom Team geschätzt werden? | ✅ Ja | Datei-I/O ist Standard |
| **Small** – Ist die Story klein genug für eine Iteration? | ✅ Ja | Fokus auf JSON-Serialisierung |
| **Testable** – Sind die Erfolgskriterien klar definiert? | ✅ Ja | Datei-Existenz und Struktur prüfbar |

---

## Technische Hinweise

- Nutzung von Node.js `fs` für Dateioperationen
- `JSON.stringify(data, null, 2)` für Pretty Print
- Zeitstempel mit `Date.now()` oder ISO-Format
- Konsolenausgabe mit Emoji für bessere Sichtbarkeit

---

## Beispiel-Output

```json
[
  {
    "testId": "abc123",
    "title": "Login > should authenticate user",
    "file": "tests/login.spec.ts",
    "location": { "line": 15, "column": 5 },
    "errors": [...],
    "steps": [...],
    "screenshots": ["test-results/screenshot.png"],
    "traces": ["test-results/trace.zip"],
    "duration": 5420,
    "status": "failed",
    "timestamp": "2024-01-15T10:30:00.000Z"
  }
]
```

---

## Definition of Done

- [ ] Code implementiert und Code-Review durchgeführt
- [ ] Alle Akzeptanzkriterien sind getestet
- [ ] Unit-Tests für JSON-Erstellung vorhanden
- [ ] Integration-Test mit echtem Testlauf
- [ ] JSON-Schema dokumentiert

