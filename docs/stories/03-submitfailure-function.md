# User Story: submitFailure Function implementieren

## Beschreibung

**WHO:** Als Backend-Entwickler

**WHAT:** Möchte ich eine Firebase Cloud Function `submitFailure` implementieren, die Failure-Daten und Test-Run Metadaten aus dem Reporter entgegennimmt, validiert und in Firestore speichert

**WHY:** Damit Test-Failures zentral gespeichert werden, Test-Runs getrackt werden können und die Daten für die spätere AI-Analyse sowie Dashboard-Anzeige verfügbar sind

## Akzeptanzkriterien (Confirmation)

- Die Function validiert den API Key aus dem `x-api-key` Header durch SHA-256 Hashing und Firestore-Lookup
- Die Function prüft, ob der API Key aktiv ist, nicht abgelaufen ist und die Scope `failures:write` besitzt
- Die Function lädt den zugehörigen Tenant und prüft, ob die monatliche Quota (`failureQuota`) nicht überschritten wurde
- **TestRun-Verwaltung:**
  - Beim ersten Failure eines Runs wird ein neues `TestRun`-Dokument in Firestore erstellt (falls noch nicht vorhanden)
  - Das TestRun-Dokument enthält alle Run-Metadaten (reportId, branch, commit, ciJobId, environment, startedAt)
  - Bei weiteren Failures des gleichen Runs werden die TestRun-Statistiken aktualisiert (totalTests, failedTests)
- Für jeden Failure im Request werden die zugehörigen Storage-Dateien (Screenshots, Traces, Videos) anhand der `testId` gesucht und verknüpft
- Jeder Failure wird als neues Dokument in der Firestore Collection `failures` gespeichert mit allen relevanten Feldern (tenantId, reportId, media URLs, analysisStatus: "pending")
- Nach erfolgreicher Speicherung werden die Nutzungsstatistiken aktualisiert: `apiKeys.lastUsedAt`, `apiKeys.usageCount` und `tenants.failureCount`
- Die Function gibt eine erfolgreiche Response mit `reportId` und allen generierten `failureIds` zurück
- Bei Fehlern werden passende HTTP-Statuscodes zurückgegeben: 401 (kein API Key), 403 (ungültiger/inaktiver Key), 429 (Quota überschritten)
- Die Function ist als HTTP-Trigger implementiert und akzeptiert POST-Requests mit JSON-Body gemäß `SubmitFailureRequest` Schema (inkl. Run-Metadaten)
- Die Implementierung folgt dem im Architekturplan definierten Ablauf-Diagramm und Pseudo-Code

## INVEST-Check

**Independent – Kann die Story eigenständig umgesetzt werden?**
✅ Ja – Die Story baut auf der bestehenden Firestore-Struktur (tenants, apiKeys) auf und benötigt die `getUploadUrls` Function als Voraussetzung, ist aber ansonsten eigenständig implementierbar.

**Negotiable – Gibt es Raum für Diskussion und Anpassungen?**
✅ Ja – Details wie Retry-Strategien, Logging-Level, Error-Messages und die genaue Struktur der Response können im Team diskutiert werden.

**Valuable – Liefert die Story einen klaren Nutzen für den Benutzer?**
✅ Ja – Ohne diese Function können keine Failures gespeichert werden. Sie ist der zentrale Einstiegspunkt für alle Test-Daten ins System.

**Estimable – Kann der Aufwand vom Team geschätzt werden?**
✅ Ja – Die Implementierung folgt einem klaren Schema (Validierung → Datenverarbeitung → Speicherung) und ist gut schätzbar (ca. 4-6 Stunden).

**Small – Ist die Story klein genug für eine Iteration?**
✅ Ja – Die Story umfasst eine einzelne Cloud Function mit klar definierten Schritten und kann in einem Sprint abgeschlossen werden.

**Testable – Sind die Erfolgskriterien klar definiert?**
✅ Ja – Alle Akzeptanzkriterien sind überprüfbar durch Unit-Tests (API Key Validierung, Quota-Prüfung) und Integrationstests (End-to-End Upload-Flow).

## Definition of Done (DoD)

_Hinweis: Diese DoD dient als Orientierung und sollte im Team abgestimmt werden._

- [ ] Die Cloud Function `submitFailure` ist implementiert und deployed
- [ ] Alle Akzeptanzkriterien sind erfüllt und getestet
- [ ] Unit-Tests für API Key Validierung, Quota-Prüfung und Error-Handling sind vorhanden und bestehen
- [ ] Integrationstests für den kompletten Upload-Flow (getUploadUrls → Upload → submitFailure) sind vorhanden und bestehen
- [ ] Error-Handling für alle definierten Fehlerfälle (401, 403, 429) ist implementiert
- [ ] Logging für wichtige Events (erfolgreiche Requests, Fehler, Quota-Überschreitungen) ist implementiert
- [ ] Code Review durch mindestens 1 Entwickler ist erfolgt
- [ ] Dokumentation der API-Endpunkte ist aktualisiert (Request/Response Schema)
- [ ] Die Function wurde in einer Staging-Umgebung getestet
- [ ] Performance-Tests zeigen akzeptable Response-Zeiten (< 2 Sekunden für typische Requests)
