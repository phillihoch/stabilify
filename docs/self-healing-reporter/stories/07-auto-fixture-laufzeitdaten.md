# Story 07: Auto-Fixture für erweiterte Laufzeit-Daten

**Phase:** Enhanced  
**Priorität:** Mittel  
**Abhängigkeiten:** Story 01-06 (MVP abgeschlossen)

---

## Beschreibung

**WHO:** Als QA-Engineer oder Entwickler

**WHAT:** Möchte ich ein Auto-Fixture haben, das automatisch bei jedem Test Laufzeit-Daten aus dem Browser sammelt (Console-Meldungen, aktuelle URL, Seitentitel)

**WHY:** Damit ich bei Testfehlern zusätzliche Kontextinformationen aus der Browser-Laufzeit habe, die über die Reporter-Daten hinausgehen

---

## Akzeptanzkriterien (Confirmation)

- [ ] Ein TypeScript-Modul `fixtures.ts` mit erweitertem `test`-Objekt existiert
- [ ] Das Fixture ist mit `{ auto: true }` konfiguriert (läuft automatisch bei jedem Test)
- [ ] Folgende Laufzeit-Daten werden gesammelt:
  - Browser-Console-Meldungen (`page.on('console')`)
  - Aktuelle URL zum Fehlerzeitpunkt (`page.url()`)
  - Seitentitel zum Fehlerzeitpunkt (`page.title()`)
- [ ] Die Daten werden nur bei fehlgeschlagenen Tests verarbeitet
- [ ] Die Laufzeit-Daten werden mit den Reporter-Daten zusammengeführt
- [ ] Das erweiterte `test`-Objekt kann in Testdateien importiert werden

---

## INVEST-Check

| Kriterium | Erfüllt | Begründung |
|-----------|---------|------------|
| **Independent** – Kann die Story eigenständig umgesetzt werden? | ⚠️ Teilweise | Baut auf MVP auf, erweitert Datensammlung |
| **Negotiable** – Gibt es Raum für Diskussion und Anpassungen? | ✅ Ja | Welche Laufzeit-Daten gesammelt werden |
| **Valuable** – Liefert die Story einen klaren Nutzen für den Benutzer? | ✅ Ja | Browser-Kontext ist wertvoll für Debugging |
| **Estimable** – Kann der Aufwand vom Team geschätzt werden? | ✅ Ja | Fixture-API ist dokumentiert |
| **Small** – Ist die Story klein genug für eine Iteration? | ✅ Ja | Fokus auf Basis-Laufzeitdaten |
| **Testable** – Sind die Erfolgskriterien klar definiert? | ✅ Ja | Datenerfassung kann verifiziert werden |

---

## Technische Hinweise

- Nutzung von `test.extend()` für Custom Fixtures
- `{ auto: true }` sorgt für automatische Ausführung
- Daten-Zusammenführung mit Reporter über SharedContext oder temporäre Dateien
- Playwright Fixtures Doku: https://playwright.dev/docs/test-fixtures

---

## Beispiel-Implementierung

```typescript
export const test = base.extend<{ selfHealingCollector: void }>({
  selfHealingCollector: [async ({ page }, use, testInfo) => {
    const consoleMessages: string[] = [];
    page.on('console', msg => consoleMessages.push(msg.text()));
    
    await use();
    
    if (testInfo.status !== 'passed') {
      // Laufzeit-Daten speichern
    }
  }, { auto: true }]
});
```

---

## Definition of Done

- [ ] Code implementiert und Code-Review durchgeführt
- [ ] Alle Akzeptanzkriterien sind getestet
- [ ] Unit-Tests für Fixture-Funktionalität vorhanden
- [ ] Integration-Test mit echtem Browser
- [ ] Dokumentation für Import in Testdateien erstellt
- [ ] Datenstruktur um `runtime`-Objekt erweitert

