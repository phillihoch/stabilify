# Story 06: Console-Output-Erfassung (stdout/stderr)

**Phase:** MVP  
**Priorität:** Mittel  
**Abhängigkeiten:** Story 02 (Fehlererkennung)

---

## Beschreibung

**WHO:** Als QA-Engineer oder Entwickler

**WHAT:** Möchte ich, dass der Reporter die Konsolenausgaben (stdout und stderr) des Tests erfasst und in der Fehlersammlung speichert

**WHY:** Damit ich bei Testfehlern auch die Log-Ausgaben und Fehlermeldungen sehe, die während des Tests generiert wurden

---

## Akzeptanzkriterien (Confirmation)

- [ ] stdout-Ausgaben aus `TestResult.stdout` werden erfasst
- [ ] stderr-Ausgaben aus `TestResult.stderr` werden erfasst
- [ ] Buffer-Inhalte werden korrekt in Strings konvertiert
- [ ] stdout und stderr werden separat gespeichert (für Filterung)
- [ ] Leere Ausgaben werden als leere Arrays gespeichert
- [ ] Mehrzeilige Ausgaben bleiben erhalten
- [ ] Die Reihenfolge der Ausgaben entspricht der Ausführungsreihenfolge

---

## INVEST-Check

| Kriterium | Erfüllt | Begründung |
|-----------|---------|------------|
| **Independent** – Kann die Story eigenständig umgesetzt werden? | ⚠️ Teilweise | Baut auf Fehlersammlung auf |
| **Negotiable** – Gibt es Raum für Diskussion und Anpassungen? | ✅ Ja | Formatierung der Ausgaben anpassbar |
| **Valuable** – Liefert die Story einen klaren Nutzen für den Benutzer? | ✅ Ja | Console-Logs sind wichtig für Debugging |
| **Estimable** – Kann der Aufwand vom Team geschätzt werden? | ✅ Ja | Einfache Daten-Extraktion |
| **Small** – Ist die Story klein genug für eine Iteration? | ✅ Ja | Fokus nur auf Console-Output |
| **Testable** – Sind die Erfolgskriterien klar definiert? | ✅ Ja | Ausgaben können verifiziert werden |

---

## Technische Hinweise

- `TestResult.stdout` und `TestResult.stderr` sind Arrays von `string | Buffer`
- Konvertierung: `.map(String)` für einheitliche String-Behandlung
- Unterscheidung zwischen Test-Console (Node.js) und Browser-Console beachten
- Browser-Console erfordert Fixture-Ansatz (siehe Story 07)

---

## Abgrenzung

Diese Story erfasst nur die **Node.js-Console-Ausgaben** des Testprozesses:
- `console.log()` im Testcode
- Playwright-interne Meldungen

Für **Browser-Console-Meldungen** (z.B. JavaScript-Fehler auf der Seite) siehe Story 07 (Auto-Fixture).

---

## Definition of Done

- [ ] Code implementiert und Code-Review durchgeführt
- [ ] Alle Akzeptanzkriterien sind getestet
- [ ] Unit-Tests für Console-Erfassung vorhanden
- [ ] Test mit verschiedenen Output-Typen (String, Buffer)
- [ ] Datenstruktur um `stdout` und `stderr` Arrays erweitert

