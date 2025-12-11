# 11. Datei-Sammler für Screenshots, Traces und Videos implementieren

## Beschreibung

**WHO:** Als Entwickler des Stabilify Reporters

**WHAT:** Möchte ich eine Funktion implementieren, die alle relevanten Dateien (Screenshots, Traces, Videos) aus den gesammelten Failures extrahiert und für den Upload vorbereitet

**WHY:** Damit der Uploader eine strukturierte Liste aller hochzuladenden Dateien mit den notwendigen Metadaten (testId, fileName, contentType, fileType) erhält und diese effizient an den Server übermitteln kann

## Akzeptanzkriterien (Confirmation)

- Die Funktion `collectFilesToUpload(failures: CollectedFailure[]): FileToUpload[]` ist implementiert und durchläuft alle Failures
- Für jeden Failure werden Screenshots, Traces und Videos aus den jeweiligen Arrays extrahiert
- Vor dem Hinzufügen zur Upload-Liste wird mit `fs.existsSync()` geprüft, ob die Datei tatsächlich existiert
- Jede Datei wird als `FileToUpload`-Objekt mit folgenden Eigenschaften erstellt:
  - `testId`: Eindeutige Test-ID aus dem Failure
  - `localPath`: Vollständiger lokaler Pfad zur Datei
  - `fileName`: Dateiname (extrahiert mit `path.basename()`)
  - `contentType`: Korrekter MIME-Type (`image/png` für Screenshots, `application/zip` für Traces, `video/webm` für Videos)
  - `fileType`: Kategorisierung als `"screenshot"`, `"trace"` oder `"video"`
- Die Funktion gibt ein Array aller gefundenen und existierenden Dateien zurück
- Bei nicht existierenden Dateien wird keine Fehlermeldung geworfen, sondern die Datei wird übersprungen
- Die Implementierung erfolgt in der `StabilifyUploader`-Klasse gemäß Architekturplan (Abschnitt 7.3)

## INVEST-Check

**Independent – Kann die Story eigenständig umgesetzt werden?**
✅ Ja. Die Story ist unabhängig umsetzbar, da sie nur die Dateisammlung implementiert und keine Abhängigkeiten zu Upload- oder Webhook-Funktionen hat. Die benötigten Interfaces (`CollectedFailure`, `FileToUpload`) sind bereits im Architekturplan definiert.

**Negotiable – Gibt es Raum für Diskussion und Anpassungen?**
✅ Ja. Details wie Fehlerbehandlung bei fehlenden Dateien (Logging vs. Silent Skip), die Reihenfolge der Dateiverarbeitung oder zusätzliche Validierungen können diskutiert werden.

**Valuable – Liefert die Story einen klaren Nutzen für den Benutzer?**
✅ Ja. Die Funktion ist essenziell für den Upload-Flow und ermöglicht die strukturierte Vorbereitung aller Dateien, die für die Fehleranalyse benötigt werden.

**Estimable – Kann der Aufwand vom Team geschätzt werden?**
✅ Ja. Die Implementierung ist klar definiert: Iteration über Arrays, Dateisystem-Checks und Objekterstellung. Aufwand: ca. 2-3 Stunden.

**Small – Ist die Story klein genug für eine Iteration?**
✅ Ja. Die Story umfasst nur die Implementierung einer einzelnen Funktion mit klarer Logik und kann in einer kurzen Iteration abgeschlossen werden.

**Testable – Sind die Erfolgskriterien klar definiert?**
✅ Ja. Die Akzeptanzkriterien sind präzise und testbar:

- Unit-Tests können mit Mock-Failures und temporären Testdateien die korrekte Extraktion prüfen
- Tests können verifizieren, dass nicht existierende Dateien übersprungen werden
- Tests können die korrekte Zuordnung von contentType und fileType validieren

**Hinweis:** Nicht alle INVEST-Kriterien müssen zwingend erfüllt sein, sie dienen als Orientierung für die Story-Qualität.

## Definition of Done (DoD)

_Hinweis: Die Definition of Done wird im Team erarbeitet. Folgende Punkte dienen als Vorschlag:_

- [ ] Die Funktion `collectFilesToUpload` ist vollständig implementiert
- [ ] Alle Akzeptanzkriterien sind erfüllt
- [ ] Unit-Tests für die Funktion sind geschrieben und bestehen:
  - Test mit gültigen Dateien (alle Typen)
  - Test mit nicht existierenden Dateien
  - Test mit leeren Failure-Arrays
  - Test mit gemischten Szenarien (einige Dateien existieren, andere nicht)
- [ ] Code-Review durch mindestens 1 Entwickler ist erfolgt
- [ ] Code folgt den Projekt-Coding-Standards (ESLint/Prettier)
- [ ] Keine neuen Linter-Warnungen oder -Fehler
- [ ] Dokumentation (JSDoc-Kommentare) ist vorhanden
- [ ] Integration in die `StabilifyUploader`-Klasse ist abgeschlossen
- [ ] Manuelle Verifikation mit echten Playwright-Test-Artefakten wurde durchgeführt
