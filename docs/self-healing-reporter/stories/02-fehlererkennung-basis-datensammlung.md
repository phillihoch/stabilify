# Story 02: Fehlererkennung und Basis-Datensammlung

**Phase:** MVP  
**Priorität:** Hoch  
**Abhängigkeiten:** Story 01 (Basis-Reporter-Struktur)

---

## Beschreibung

**WHO:** Als QA-Engineer oder Entwickler

**WHAT:** Möchte ich, dass der Reporter fehlgeschlagene Tests automatisch erkennt und grundlegende Fehlerinformationen sammelt (Fehlermeldung, Stack-Trace, Test-Lokation)

**WHY:** Damit ich bei Testfehlern sofort alle relevanten Basis-Informationen zur Fehleranalyse zur Verfügung habe

---

## Akzeptanzkriterien (Confirmation)

- [ ] Der Reporter erkennt Tests mit Status `failed`, `timedOut` und `interrupted`
- [ ] Tests mit Status `passed` und `skipped` werden ignoriert
- [ ] Folgende Basis-Informationen werden pro Fehler gesammelt:
  - Test-ID und vollständiger Test-Titel (mit Titlepath)
  - Dateiname und Zeilennummer des Tests
  - Fehlermeldung(en) aus `TestResult.errors`
  - Stack-Trace aus `TestError.stack`
  - Code-Snippet um den Fehler (wenn verfügbar)
  - Testdauer in Millisekunden
  - Retry-Nummer
  - Zeitstempel des Fehlers
- [ ] Mehrere Fehler in einem Testlauf werden korrekt in einer Liste gesammelt
- [ ] Die Datenstruktur entspricht dem definierten `CollectedFailure`-Interface

---

## INVEST-Check

| Kriterium | Erfüllt | Begründung |
|-----------|---------|------------|
| **Independent** – Kann die Story eigenständig umgesetzt werden? | ⚠️ Teilweise | Benötigt Story 01 als Grundlage |
| **Negotiable** – Gibt es Raum für Diskussion und Anpassungen? | ✅ Ja | Welche Felder gesammelt werden, ist anpassbar |
| **Valuable** – Liefert die Story einen klaren Nutzen für den Benutzer? | ✅ Ja | Kernfunktionalität für Fehleranalyse |
| **Estimable** – Kann der Aufwand vom Team geschätzt werden? | ✅ Ja | API-Nutzung ist dokumentiert |
| **Small** – Ist die Story klein genug für eine Iteration? | ✅ Ja | Fokus auf Fehlererkennung ohne Output |
| **Testable** – Sind die Erfolgskriterien klar definiert? | ✅ Ja | Datenstruktur ist klar spezifiziert |

---

## Technische Hinweise

- `TestResult`-Objekt enthält alle benötigten Informationen
- `test.titlePath()` liefert die vollständige Hierarchie des Testnamens
- `TestError`-Interface: https://playwright.dev/docs/api/class-testerror

---

## Definition of Done

- [ ] Code implementiert und Code-Review durchgeführt
- [ ] Alle Akzeptanzkriterien sind getestet
- [ ] Unit-Tests für Fehlererkennung und Datensammlung vorhanden
- [ ] Edge-Cases abgedeckt (mehrere Fehler, keine Fehler, Timeout)
- [ ] TypeScript-Interface `CollectedFailure` definiert

