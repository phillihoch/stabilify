# 13. End-to-End Upload-Flow Integration implementieren

## Beschreibung

**WHO:** Als Entwickler, der Stabilify in meinem Playwright-Projekt nutzt

**WHAT:** Möchte ich einen vollständigen Upload-Flow implementieren, der Dateien über signierte URLs hochlädt und Failure-Daten an den Server übermittelt

**WHY:** Damit Test-Failures automatisch mit allen relevanten Artefakten (Screenshots, Traces, Videos) an den Stabilify-Server übertragen werden und dort für die KI-Analyse zur Verfügung stehen

## Akzeptanzkriterien (Confirmation)

- Der Reporter sammelt alle relevanten Dateien (Screenshots, Traces, Videos) aus fehlgeschlagenen Tests
- Signierte Upload-URLs werden erfolgreich vom Server angefordert (POST /getUploadUrls)
- Alle gesammelten Dateien werden mit den signierten URLs direkt an Cloud Storage hochgeladen
- Nach erfolgreichem Upload werden die Failure-Daten inklusive Referenzen zu den hochgeladenen Dateien an den Server übermittelt (POST /submitFailure)
- Der Upload-Flow beinhaltet Retry-Logik mit konfigurierbaren Versuchen und Verzögerungen
- Fehler während des Upload-Prozesses werden aussagekräftig geloggt und führen nicht zum Abbruch des gesamten Test-Runs
- Die Konfiguration erfolgt über die Reporter-Optionen mit API-Key und optionalem Endpoint
- Der Upload kann über die Option `upload.enabled` aktiviert/deaktiviert werden
- Die TenantId wird automatisch vom Server aus dem API-Key ermittelt und muss nicht manuell konfiguriert werden

## INVEST-Check

**Independent – Kann die Story eigenständig umgesetzt werden?**
✅ Ja. Die Story baut auf der bestehenden Reporter-Infrastruktur auf und implementiert einen in sich geschlossenen Upload-Flow. Die Server-Endpoints (getUploadUrls, submitFailure) sind im Architekturplan definiert.

**Negotiable – Gibt es Raum für Diskussion und Anpassungen?**
✅ Ja. Details wie Retry-Anzahl, Timeout-Werte, Logging-Level und Error-Handling-Strategien können im Team diskutiert und angepasst werden.

**Valuable – Liefert die Story einen klaren Nutzen für den Benutzer?**
✅ Ja. Entwickler erhalten einen automatisierten Upload-Mechanismus, der Test-Failures mit allen Artefakten an den Server überträgt, ohne manuelle Eingriffe oder komplexe Konfiguration.

**Estimable – Kann der Aufwand vom Team geschätzt werden?**
✅ Ja. Die Story umfasst klar definierte Komponenten (Datei-Sammlung, URL-Anforderung, Upload, Webhook-Aufruf) mit bekannten Technologien (HTTP-Requests, File-Handling).

**Small – Ist die Story klein genug für eine Iteration?**
⚠️ Teilweise. Die Story umfasst mehrere Phasen (URL-Anforderung, Upload, Webhook). Eine Aufteilung in kleinere Stories (z.B. "Signierte URLs anfordern", "Datei-Upload implementieren", "Webhook-Integration") könnte sinnvoll sein, ist aber nicht zwingend erforderlich.

**Testable – Sind die Erfolgskriterien klar definiert?**
✅ Ja. Die Akzeptanzkriterien beschreiben überprüfbare Bedingungen für jeden Schritt des Upload-Flows, von der Datei-Sammlung bis zur erfolgreichen Übermittlung.

**Hinweis:** Nicht alle INVEST-Kriterien müssen zwingend erfüllt sein. Sie dienen als Orientierung zur Qualitätssicherung im Refinement.

## Definition of Done (DoD)

**Hinweis:** Die Definition of Done wird im Team erarbeitet. Folgende Punkte dienen als Vorschlag:

- Alle Akzeptanzkriterien sind erfüllt und getestet
- Der Upload-Flow wurde mit echten Test-Failures und verschiedenen Datei-Typen getestet
- Unit-Tests für die Uploader-Klasse sind implementiert und bestehen
- Integration-Tests für den End-to-End-Flow sind vorhanden
- Error-Handling wurde mit verschiedenen Fehlerszenarien getestet (Netzwerkfehler, ungültige API-Keys, Quota-Überschreitung)
- Die Retry-Logik wurde verifiziert
- Code-Review durch mindestens einen Entwickler ist erfolgt
- Dokumentation der Reporter-Konfiguration ist aktualisiert
- Logging-Ausgaben sind aussagekräftig und hilfreich für Debugging
- Performance-Tests zeigen, dass der Upload den Test-Run nicht signifikant verzögert
