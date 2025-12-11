# 12. Retry-Logik für Upload-Fehler implementieren

## Beschreibung

**WHO:** Als Entwickler, der Stabilify in meiner CI/CD-Pipeline nutzt

**WHAT:** Möchte ich, dass fehlgeschlagene Datei-Uploads automatisch wiederholt werden

**WHY:** Damit temporäre Netzwerkprobleme oder Timeouts nicht zum Verlust von wichtigen Fehleranalyse-Daten führen und die Zuverlässigkeit des Upload-Prozesses erhöht wird

## Akzeptanzkriterien (Confirmation)

- Fehlgeschlagene Uploads werden automatisch mit exponentiellem Backoff wiederholt (z.B. 1s, 2s, 4s)
- Die maximale Anzahl an Retry-Versuchen ist konfigurierbar (Standard: 3 Versuche)
- Das Retry-Delay ist konfigurierbar (Standard: 1000ms initial)
- Bei dauerhaftem Fehlschlagen wird ein aussagekräftiger Fehler geloggt, der die Ursache und alle Retry-Versuche dokumentiert
- Erfolgreiche Uploads nach Retry werden mit entsprechendem Log-Hinweis versehen (z.B. "Upload erfolgreich nach 2 Versuchen")
- Die Retry-Logik gilt sowohl für das Holen der signierten URLs (`getUploadUrls`) als auch für den eigentlichen Datei-Upload (PUT mit signierter URL) und den Webhook-Aufruf (`submitFailure`)
- Transiente Fehler (Netzwerk-Timeouts, 5xx Server-Fehler) werden wiederholt, permanente Fehler (401, 403, 400) nicht

## INVEST-Check

**Independent – Kann die Story eigenständig umgesetzt werden?**
✅ Ja. Die Story baut auf der bestehenden Upload-Architektur auf (siehe Architektur-Plan Abschnitt 7.1 und 7.3), benötigt aber keine Änderungen an anderen Komponenten. Die Retry-Logik kann isoliert im `StabilifyUploader` implementiert werden.

**Negotiable – Gibt es Raum für Diskussion und Anpassungen?**
✅ Ja. Die konkreten Werte für Retry-Anzahl, Backoff-Strategie und welche Fehlertypen wiederholt werden, können im Team diskutiert werden. Auch die Frage, ob Retries für alle drei Phasen (URLs holen, Upload, Webhook) oder nur für bestimmte Phasen gelten sollen, ist verhandelbar.

**Valuable – Liefert die Story einen klaren Nutzen für den Benutzer?**
✅ Ja. Erhöht die Zuverlässigkeit des Upload-Prozesses erheblich, besonders in instabilen Netzwerkumgebungen (CI/CD-Pipelines, Cloud-Umgebungen). Verhindert Datenverlust bei temporären Problemen.

**Estimable – Kann der Aufwand vom Team geschätzt werden?**
✅ Ja. Die Implementierung umfasst eine Retry-Helper-Funktion mit exponentiellem Backoff und die Integration in die drei bestehenden Upload-Methoden. Aufwand ist gut abschätzbar (ca. 2-4 Stunden).

**Small – Ist die Story klein genug für eine Iteration?**
✅ Ja. Die Story fokussiert sich ausschließlich auf die Retry-Logik und kann in einer kurzen Iteration umgesetzt werden.

**Testable – Sind die Erfolgskriterien klar definiert?**
✅ Ja. Die Akzeptanzkriterien sind überprüfbar durch Unit-Tests (Mock-Fehler simulieren) und Integrationstests (echte Netzwerkfehler provozieren).

## Definition of Done (DoD)

_Hinweis: Diese DoD dient als Vorschlag und sollte im Team abgestimmt werden._

- [ ] Retry-Helper-Funktion mit exponentiellem Backoff ist implementiert
- [ ] Retry-Logik ist in `getUploadUrls()`, `uploadFiles()` und `submitFailures()` integriert
- [ ] Konfigurationsoptionen `retryAttempts` und `retryDelayMs` sind in `SelfHealingReporterOptions.upload` verfügbar
- [ ] Transiente vs. permanente Fehler werden korrekt unterschieden
- [ ] Alle Retry-Versuche und deren Ergebnisse werden aussagekräftig geloggt
- [ ] Unit-Tests für die Retry-Logik sind geschrieben und bestehen
- [ ] Integrationstests mit simulierten Netzwerkfehlern sind erfolgreich
- [ ] Code-Review durch mindestens 1 Entwickler ist erfolgt
- [ ] Dokumentation in der README oder im Architektur-Plan ist aktualisiert
