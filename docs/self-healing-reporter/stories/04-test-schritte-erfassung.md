# Story 04: Test-Schritte (Steps) Erfassung

**Phase:** MVP  
**Priorität:** Mittel  
**Abhängigkeiten:** Story 02 (Fehlererkennung)

---

## Beschreibung

**WHO:** Als QA-Engineer oder Entwickler

**WHAT:** Möchte ich, dass der Reporter alle ausgeführten Test-Schritte mit ihren Details (Titel, Dauer, Kategorie, Fehlerstatus) erfasst

**WHY:** Damit ich nachvollziehen kann, welche Aktionen vor dem Fehler ausgeführt wurden und an welcher Stelle der Ablauf gescheitert ist

---

## Akzeptanzkriterien (Confirmation)

- [ ] Alle Schritte aus `TestResult.steps` werden erfasst
- [ ] Pro Schritt werden folgende Informationen gespeichert:
  - Schritt-Titel (`title`)
  - Dauer in Millisekunden (`duration`)
  - Kategorie (`category`: z.B. `pw:api`, `expect`, `test.step`, `hook`)
  - Fehlermeldung falls vorhanden (`error?.message`)
- [ ] Die Schritte werden in der korrekten Reihenfolge (Ausführungsreihenfolge) gespeichert
- [ ] Verschachtelte Schritte werden korrekt erfasst
- [ ] Der letzte fehlgeschlagene Schritt ist eindeutig identifizierbar

---

## INVEST-Check

| Kriterium | Erfüllt | Begründung |
|-----------|---------|------------|
| **Independent** – Kann die Story eigenständig umgesetzt werden? | ⚠️ Teilweise | Baut auf Fehlersammlung auf |
| **Negotiable** – Gibt es Raum für Diskussion und Anpassungen? | ✅ Ja | Detailtiefe der Schritte anpassbar |
| **Valuable** – Liefert die Story einen klaren Nutzen für den Benutzer? | ✅ Ja | Ermöglicht Nachvollziehbarkeit des Testverlaufs |
| **Estimable** – Kann der Aufwand vom Team geschätzt werden? | ✅ Ja | API-Struktur ist klar dokumentiert |
| **Small** – Ist die Story klein genug für eine Iteration? | ✅ Ja | Fokus auf Steps-Mapping |
| **Testable** – Sind die Erfolgskriterien klar definiert? | ✅ Ja | Schrittstruktur ist verifizierbar |

---

## Technische Hinweise

- `TestResult.steps` enthält ein Array von `TestStep`-Objekten
- `TestStep`-Interface: https://playwright.dev/docs/api/class-teststep
- Kategorien helfen bei der Filterung (Playwright-API vs. Custom Steps)
- Custom Steps werden mit `test.step()` im Testcode definiert

---

## Definition of Done

- [ ] Code implementiert und Code-Review durchgeführt
- [ ] Alle Akzeptanzkriterien sind getestet
- [ ] Unit-Tests für Steps-Erfassung vorhanden
- [ ] Test mit verschiedenen Schritt-Kategorien
- [ ] Datenstruktur um `steps`-Array erweitert

