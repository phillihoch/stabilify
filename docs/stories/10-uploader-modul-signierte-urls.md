# Story 10: Uploader-Modul für signierte URLs implementieren

## Beschreibung

**WHO:** Als Entwickler des Stabilify-Reporters

**WHAT:** Möchte ich ein Uploader-Modul implementieren, das signierte URLs vom Server anfordert und Dateien (Screenshots, Traces, Videos) direkt an Cloud Storage hochlädt

**WHY:** Damit der Reporter Testfehler-Dateien sicher und performant an den Stabilify-Server übermitteln kann, ohne komplexe Storage-Rules zu benötigen und mit minimalen Firestore-Reads

## Akzeptanzkriterien (Confirmation)

- Das Modul sammelt alle hochzuladenden Dateien aus den CollectedFailure-Objekten (Screenshots, Traces, Videos)
- Es fordert signierte Upload-URLs vom `/getUploadUrls`-Endpoint an, indem es den API-Key im Header `x-api-key` mitsendet
- Die Anfrage enthält für jede Datei: `testId`, `fileName`, `contentType` und `fileType`
- Das Modul erhält vom Server signierte PUT-URLs mit 15 Minuten Gültigkeit sowie die `tenantId`
- Alle Dateien werden parallel mit den signierten URLs per PUT-Request an Cloud Storage hochgeladen
- Der Upload erfolgt mit korrektem `Content-Type`-Header entsprechend des Dateityps
- Bei Upload-Fehlern wird ein aussagekräftiger Fehler geloggt
- Das Modul gibt Feedback über die Anzahl der erfolgreich hochgeladenen Dateien
- Nicht existierende Dateipfade werden übersprungen und geloggt
- Die Implementierung ist als eigenständige Klasse `StabilifyUploader` strukturiert

## INVEST-Check

**Independent – Kann die Story eigenständig umgesetzt werden?**
✅ Ja. Die Story baut auf der bestehenden Reporter-Struktur auf und nutzt den bereits geplanten `/getUploadUrls`-Endpoint. Sie ist unabhängig von der Webhook-Implementierung (Story 11) und der AI-Analyse.

**Negotiable – Gibt es Raum für Diskussion und Anpassungen?**
✅ Ja. Details wie Retry-Logik, parallele vs. sequentielle Uploads, Logging-Level und Error-Handling können im Team diskutiert werden. Die Grundfunktionalität ist klar definiert.

**Valuable – Liefert die Story einen klaren Nutzen für den Benutzer?**
✅ Ja. Ermöglicht den sicheren und performanten Upload von Testfehler-Dateien ohne komplexe Storage-Rules. Reduziert Firestore-Reads und damit Kosten. Legt die Grundlage für die vollständige Server-Integration.

**Estimable – Kann der Aufwand vom Team geschätzt werden?**
✅ Ja. Die Implementierung umfasst klar definierte Schritte: Dateisammlung, HTTP-Request für URLs, parallele PUT-Requests. Ähnliche Upload-Logik ist aus anderen Projekten bekannt.

**Small – Ist die Story klein genug für eine Iteration?**
✅ Ja. Die Story fokussiert sich ausschließlich auf den Upload-Mechanismus. Webhook-Aufruf und Retry-Logik sind separate Stories. Umsetzung in 1-2 Tagen realistisch.

**Testable – Sind die Erfolgskriterien klar definiert?**
✅ Ja. Erfolg ist messbar durch: Dateien werden gesammelt, signierte URLs werden angefordert, Dateien werden hochgeladen, Logs zeigen Erfolg/Fehler. Integration-Tests mit Mock-Server möglich.

**Hinweis:** Nicht alle INVEST-Kriterien müssen zwingend erfüllt sein, sie dienen als Orientierung für die Story-Qualität.

## Definition of Done (DoD)

**Hinweis:** Die Definition of Done wird im Team erarbeitet. Folgende Punkte dienen als Vorschlag:

- [ ] Alle Akzeptanzkriterien sind implementiert und getestet
- [ ] Die Klasse `StabilifyUploader` ist erstellt mit den Methoden `collectFilesToUpload()`, `getUploadUrls()`, `uploadFiles()`
- [ ] Unit-Tests für die Dateisammlung sind vorhanden und bestehen
- [ ] Integration-Tests mit Mock-Server für den Upload-Flow sind vorhanden und bestehen
- [ ] Fehlerbehandlung für fehlende Dateien, Netzwerkfehler und ungültige API-Keys ist implementiert
- [ ] Logging gibt aussagekräftige Informationen über Upload-Fortschritt und Fehler aus
- [ ] Code-Review durch mindestens 1 Entwickler ist erfolgt
- [ ] Dokumentation der Uploader-Klasse ist aktualisiert (JSDoc/TSDoc)
- [ ] Keine neuen Linter-Fehler oder Warnungen
- [ ] Die Implementierung folgt den TypeScript-Best-Practices des Projekts
