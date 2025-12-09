# Story 03: Screenshot- und Trace-Extraktion aus Attachments

**Phase:** MVP  
**Priorität:** Hoch  
**Abhängigkeiten:** Story 02 (Fehlererkennung)

---

## Beschreibung

**WHO:** Als QA-Engineer oder Entwickler

**WHAT:** Möchte ich, dass der Reporter Screenshots, Traces und Videos aus den Test-Attachments extrahiert und deren Pfade in der Fehlersammlung speichert

**WHY:** Damit ich bei Testfehlern visuelle Beweise und detaillierte Ablaufprotokolle zur Verfügung habe, um die Fehlerursache schneller zu identifizieren

---

## Akzeptanzkriterien (Confirmation)

- [ ] Screenshots werden anhand des ContentTypes `image/*` identifiziert und deren Pfade gespeichert
- [ ] Traces werden anhand des Attachment-Namens `trace` identifiziert und deren Pfade gespeichert
- [ ] Videos werden anhand des ContentTypes `video/*` identifiziert und deren Pfade gespeichert
- [ ] Embedded Attachments (ohne Pfad) werden als `[embedded]` gekennzeichnet
- [ ] Mehrere Attachments desselben Typs werden alle erfasst (Array)
- [ ] Die Pfade sind als relative oder absolute Pfade gespeichert und für die Weiterverarbeitung nutzbar
- [ ] Playwright-Konfiguration nutzt:
  - `screenshot: 'only-on-failure'`
  - `trace: 'retain-on-failure'`

---

## INVEST-Check

| Kriterium | Erfüllt | Begründung |
|-----------|---------|------------|
| **Independent** – Kann die Story eigenständig umgesetzt werden? | ⚠️ Teilweise | Baut auf Fehlersammlung (Story 02) auf |
| **Negotiable** – Gibt es Raum für Diskussion und Anpassungen? | ✅ Ja | Video-Support kann optional sein |
| **Valuable** – Liefert die Story einen klaren Nutzen für den Benutzer? | ✅ Ja | Visuelle Debugging-Informationen |
| **Estimable** – Kann der Aufwand vom Team geschätzt werden? | ✅ Ja | Attachment-Iteration ist straightforward |
| **Small** – Ist die Story klein genug für eine Iteration? | ✅ Ja | Fokus nur auf Attachment-Extraktion |
| **Testable** – Sind die Erfolgskriterien klar definiert? | ✅ Ja | Pfade können verifiziert werden |

---

## Technische Hinweise

- Attachments sind in `TestResult.attachments` verfügbar
- Attachment-Struktur:
  ```typescript
  interface Attachment {
    name: string;
    contentType: string;
    path?: string;
    body?: Buffer;
  }
  ```
- Playwright erstellt Attachments automatisch bei entsprechender Konfiguration

---

## Definition of Done

- [ ] Code implementiert und Code-Review durchgeführt
- [ ] Alle Akzeptanzkriterien sind getestet
- [ ] Unit-Tests für Attachment-Extraktion vorhanden
- [ ] Integration-Test mit echtem Screenshot/Trace
- [ ] Datenstruktur um `screenshots`, `traces`, `videos` Arrays erweitert

