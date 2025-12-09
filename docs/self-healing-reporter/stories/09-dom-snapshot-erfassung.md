# Story 09: DOM-Snapshot-Erfassung

**Phase:** Enhanced  
**Priorität:** Niedrig  
**Abhängigkeiten:** Story 07 (Auto-Fixture)

---

## Beschreibung

**WHO:** Als QA-Engineer oder Entwickler

**WHAT:** Möchte ich, dass bei einem Testfehler ein DOM-Snapshot der aktuellen Seite erstellt und gespeichert wird

**WHY:** Damit ich den exakten Zustand der Seite zum Fehlerzeitpunkt analysieren kann, um Selektor-Probleme oder fehlende Elemente zu identifizieren

---

## Akzeptanzkriterien (Confirmation)

- [ ] Bei Testfehlern wird der aktuelle DOM-Zustand erfasst (`page.content()`)
- [ ] Der DOM-Snapshot wird als HTML-String gespeichert
- [ ] Der Snapshot enthält den vollständigen `<html>`-Inhalt
- [ ] Optional: Snapshot wird als separate HTML-Datei gespeichert (nicht nur inline)
- [ ] Der Snapshot-Pfad oder -Inhalt wird in `runtime.domSnapshot` gespeichert
- [ ] Große DOMs werden nicht abgeschnitten (bis zu einem konfigurierbaren Limit)

---

## INVEST-Check

| Kriterium | Erfüllt | Begründung |
|-----------|---------|------------|
| **Independent** – Kann die Story eigenständig umgesetzt werden? | ⚠️ Teilweise | Erweitert Auto-Fixture aus Story 07 |
| **Negotiable** – Gibt es Raum für Diskussion und Anpassungen? | ✅ Ja | Inline vs. Datei, Größenlimit |
| **Valuable** – Liefert die Story einen klaren Nutzen für den Benutzer? | ✅ Ja | DOM-Analyse für Selektor-Debugging |
| **Estimable** – Kann der Aufwand vom Team geschätzt werden? | ✅ Ja | Einfacher API-Aufruf |
| **Small** – Ist die Story klein genug für eine Iteration? | ✅ Ja | Fokus nur auf DOM-Snapshot |
| **Testable** – Sind die Erfolgskriterien klar definiert? | ✅ Ja | HTML-Inhalt kann verifiziert werden |

---

## Technische Hinweise

- `page.content()` liefert den vollständigen HTML-Inhalt
- Achtung: Große DOMs können Performance-Probleme verursachen
- Optional: Nur einen Teil des DOMs speichern (z.B. `body`)
- Externe Dateispeicherung reduziert JSON-Größe

---

## Überlegungen zur Größe

| Speicherort | Vorteile | Nachteile |
|-------------|----------|-----------|
| Inline (String) | Alles in einer Datei | JSON kann sehr groß werden |
| Externe Datei | Kompakte JSON | Mehrere Dateien zu verwalten |

**Empfehlung:** Bei DOMs > 100KB als externe Datei speichern.

---

## Definition of Done

- [ ] Code implementiert und Code-Review durchgeführt
- [ ] Alle Akzeptanzkriterien sind getestet
- [ ] Unit-Tests für DOM-Snapshot vorhanden
- [ ] Performance-Test mit großem DOM
- [ ] `runtime.domSnapshot` in Datenstruktur integriert
- [ ] Konfigurierbare Größenlimits dokumentiert

