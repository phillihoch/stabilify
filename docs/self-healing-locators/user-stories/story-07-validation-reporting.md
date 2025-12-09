# User Story 7: Validierung, Reporting und Human-in-the-Loop

## Beschreibung

**WHO:** Als QA-Engineer / Test-Manager

**WHAT:** Möchte ich geheilte Test-Aktionen transparent nachvollziehen, validieren und genehmigen können, bevor sie permanent in die Codebasis übernommen werden

**WHY:** Damit ich False Positives erkenne, die Qualität der AI-Heilungen sicherstelle und bewusste Entscheidungen über permanente Selektor-Änderungen treffen kann

---

## Akzeptanzkriterien

### 1. Markierung geheilter Aktionen im Test-Report
- Playwright-Reporter wird erweitert (Custom Reporter oder HTML-Reporter-Plugin)
- Geheilte Aktionen werden im Report mit speziellem Status markiert:
  - ⚠️ **HEALED** (statt ✅ PASSED)
  - Visuelle Unterscheidung durch Farbe (z.B. Orange statt Grün)
- Anzahl geheilter Aktionen wird in der Test-Summary angezeigt

### 2. Diff-Visualisierung
- Für jede geheilte Aktion wird ein Diff angezeigt:
  ```
  Original Selector:  button[name='submit-order']
  Healed Selector:    button[data-testid='submit-btn']
  Healing Method:     AI (GPT-4o Vision)
  Confidence:         High
  Timestamp:          2025-01-15 10:30:45
  ```
- Screenshot des Elements zum Zeitpunkt der Heilung (optional)
- Link zum AI-Audit-Log (Story 6)

### 3. Approval-Workflow
- Eine CLI-Tool oder Web-UI ist verfügbar für Review:
  ```bash
  npm run review-healings
  ```
- Das Tool zeigt alle pending Healings an
- Für jedes Healing kann der Reviewer:
  - ✅ **Approve:** Mapping wird permanent in `healing-map.json` übernommen
  - ❌ **Reject:** Mapping wird verworfen, Test muss manuell gefixt werden
  - 🔄 **Retry:** Healing-Prozess wird erneut ausgeführt
- Genehmigte Healings werden mit `approved: true` Flag markiert

### 4. False-Positive-Detection
- Automatische Warnung bei verdächtigen Heilungen:
  - Selektor zeigt auf Element mit anderem Text als erwartet
  - Selektor zeigt auf Element mit anderer ARIA-Rolle
  - Selektor zeigt auf Element in anderem Bereich der Seite (z.B. Header statt Footer)
- Confidence-Score wird berechnet (Low/Medium/High)
- Low-Confidence-Healings erfordern manuelle Genehmigung

### 5. Rollback-Mechanismus
- Möglichkeit, ein genehmigtes Healing rückgängig zu machen:
  ```bash
  npm run rollback-healing --selector "button[name='submit-order']"
  ```
- Rollback entfernt das Mapping aus `healing-map.json`
- Rollback-Aktion wird geloggt

### 6. Dashboard für Heilungs-Statistiken
- Ein HTML-Dashboard zeigt aggregierte Metriken:
  - Anzahl Heilungen pro Tag/Woche
  - Erfolgsrate (Heuristik vs. AI)
  - Durchschnittliche Heilungszeit
  - Top 10 häufigste geheilte Selektoren
  - Kosten-Übersicht (API-Calls, Token-Verbrauch)
- Dashboard wird automatisch nach jedem Testlauf aktualisiert
- Dashboard ist über `npm run healing-dashboard` aufrufbar

### 7. Integration in CI/CD
- CI/CD-Pipeline kann konfiguriert werden, um:
  - Tests mit Healings als "unstable" zu markieren (nicht als Failure)
  - Automatische Benachrichtigung an Slack/Teams bei neuen Healings
  - Blockierung des Merges, wenn unapproved Healings existieren (optional)
- Umgebungsvariable `CI_REQUIRE_HEALING_APPROVAL=true`

---

## Definition of Done

- [ ] Custom Playwright Reporter ist implementiert
- [ ] Geheilte Aktionen werden im HTML-Report korrekt markiert
- [ ] Diff-Visualisierung ist implementiert
- [ ] CLI-Tool für Approval-Workflow ist funktionsfähig
- [ ] False-Positive-Detection mit Confidence-Score ist implementiert
- [ ] Rollback-Mechanismus ist implementiert und getestet
- [ ] HTML-Dashboard für Statistiken ist erstellt
- [ ] Integration in CI/CD ist dokumentiert und getestet
- [ ] Unit-Tests für Reporter-Logik (min. 80% Coverage)
- [ ] End-to-End-Test des kompletten Approval-Workflows
- [ ] Dokumentation für QA-Engineers (Nutzung des Review-Tools)
- [ ] Code-Review durch mindestens 1 Senior Engineer
- [ ] User-Acceptance-Test mit QA-Team erfolgreich

