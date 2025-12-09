# Story 01: Basis-Reporter-Struktur mit Playwright-Integration

**Phase:** MVP  
**Priorität:** Hoch  
**Abhängigkeiten:** Keine

---

## Beschreibung

**WHO:** Als QA-Engineer oder Entwickler

**WHAT:** Möchte ich einen Custom Playwright Reporter einrichten, der sich in die Playwright-Konfiguration integriert und bei Testausführungen automatisch aktiviert wird

**WHY:** Damit ich eine Grundlage habe, auf der alle weiteren Fehlererkennungs- und Datensammlungsfunktionen aufgebaut werden können

---

## Akzeptanzkriterien (Confirmation)

- [ ] Ein TypeScript-Modul `self-healing-reporter.ts` existiert und implementiert das Playwright `Reporter`-Interface
- [ ] Der Reporter implementiert die Lifecycle-Methoden `onBegin()`, `onTestEnd()` und `onEnd()`
- [ ] Der Reporter kann in `playwright.config.ts` über das `reporter`-Array eingebunden werden
- [ ] Der Reporter läuft parallel zum Standard-Reporter (z.B. `list`) ohne diesen zu beeinträchtigen
- [ ] Die Methode `printsToStdio()` gibt `false` zurück, um Konflikte mit anderen Reportern zu vermeiden
- [ ] Ein Output-Verzeichnis `self-healing-output` wird beim Start erstellt, falls nicht vorhanden

---

## INVEST-Check

| Kriterium | Erfüllt | Begründung |
|-----------|---------|------------|
| **Independent** – Kann die Story eigenständig umgesetzt werden? | ✅ Ja | Grundlage ohne Abhängigkeiten zu anderen Stories |
| **Negotiable** – Gibt es Raum für Diskussion und Anpassungen? | ✅ Ja | Verzeichnisname und Dateistruktur können angepasst werden |
| **Valuable** – Liefert die Story einen klaren Nutzen für den Benutzer? | ✅ Ja | Schafft die Basis für alle weiteren Funktionen |
| **Estimable** – Kann der Aufwand vom Team geschätzt werden? | ✅ Ja | Klar abgegrenzte Implementierung |
| **Small** – Ist die Story klein genug für eine Iteration? | ✅ Ja | Fokus nur auf Grundstruktur |
| **Testable** – Sind die Erfolgskriterien klar definiert? | ✅ Ja | Reporter-Einbindung und Lifecycle können verifiziert werden |

---

## Technische Hinweise

- Playwright Reporter API: https://playwright.dev/docs/api/class-reporter
- Konfiguration erfolgt in `playwright.config.ts`
- Empfohlene Playwright-Einstellungen für Fehleranalyse:
  ```typescript
  use: {
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
  }
  ```

---

## Definition of Done

- [ ] Code implementiert und Code-Review durchgeführt
- [ ] Reporter kann erfolgreich in `playwright.config.ts` eingebunden werden
- [ ] Playwright-Tests laufen ohne Fehler mit aktiviertem Reporter
- [ ] Unit-Tests für Reporter-Lifecycle vorhanden
- [ ] Dokumentation aktualisiert

