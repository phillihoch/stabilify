# User Story: API Key Validierungs-Middleware implementieren

## Beschreibung

**WHO:** Als Backend-Entwickler

**WHAT:** Möchte ich eine wiederverwendbare Middleware zur API-Key-Validierung implementieren

**WHY:** Damit alle Firebase Functions (getUploadUrls, submitFailure) eine zentrale, konsistente und sichere Authentifizierung nutzen können und ich nicht in jeder Function die gleiche Validierungslogik duplizieren muss

## Akzeptanzkriterien (Confirmation)

- Die Middleware extrahiert den API Key aus dem `x-api-key` Header und gibt einen 401-Fehler zurück, wenn dieser fehlt
- Der API Key wird mittels SHA-256 gehasht und gegen die `apiKeys` Collection in Firestore validiert
- Die Middleware prüft, ob der API Key aktiv ist (`active: true`) und nicht abgelaufen ist (`expiresAt` noch nicht erreicht), andernfalls wird ein 403-Fehler zurückgegeben
- Die Middleware prüft optional erforderliche Scopes (z.B. `storage:write`, `failures:write`) und gibt bei fehlenden Berechtigungen einen 403-Fehler zurück
- Die Middleware aktualisiert `lastUsedAt` und erhöht `usageCount` bei erfolgreicher Validierung
- Die validierte API-Key-Daten (inkl. `tenantId`) werden im Request-Objekt für nachfolgende Handler verfügbar gemacht
- Die Middleware ist als wiederverwendbare Funktion implementiert, die in verschiedenen Firebase Functions eingebunden werden kann
- Es existieren Unit-Tests, die alle Validierungsszenarien abdecken (fehlender Key, ungültiger Key, inaktiver Key, abgelaufener Key, fehlende Scopes, erfolgreiche Validierung)

## INVEST-Check

**Independent – Kann die Story eigenständig umgesetzt werden?**
✅ **Ja** – Die Middleware kann unabhängig entwickelt werden. Sie benötigt lediglich Zugriff auf Firestore (bereits vorhanden) und das definierte Datenmodell für `apiKeys` (dokumentiert im Architekturplan).

**Negotiable – Gibt es Raum für Diskussion und Anpassungen?**
✅ **Ja** – Details wie die genaue Fehlerbehandlung, Logging-Strategie oder die Implementierung der Scope-Prüfung können im Team diskutiert werden. Die Kernfunktionalität (Validierung + Hashing) ist klar definiert.

**Valuable – Liefert die Story einen klaren Nutzen für den Benutzer?**
✅ **Ja** – Die Middleware schafft eine zentrale, wiederverwendbare Sicherheitskomponente, reduziert Code-Duplikation und stellt sicher, dass alle API-Endpunkte konsistent geschützt sind. Dies erhöht die Wartbarkeit und Sicherheit des Systems.

**Estimable – Kann der Aufwand vom Team geschätzt werden?**
✅ **Ja** – Die Anforderungen sind klar definiert. Die Implementierung umfasst: Hashing-Logik, Firestore-Abfrage, Status-Prüfungen, Scope-Validierung und Update-Logik. Erfahrene Entwickler können den Aufwand gut einschätzen (ca. 4-6 Stunden inkl. Tests).

**Small – Ist die Story klein genug für eine Iteration?**
✅ **Ja** – Die Story ist auf eine einzelne, klar abgegrenzte Komponente fokussiert und kann innerhalb eines Sprints (oder sogar eines Tages) umgesetzt werden.

**Testable – Sind die Erfolgskriterien klar definiert?**
✅ **Ja** – Die Akzeptanzkriterien beschreiben konkrete, überprüfbare Bedingungen. Unit-Tests können alle Szenarien (Fehler- und Erfolgsfälle) abdecken.

> **Hinweis:** Nicht alle INVEST-Kriterien müssen zwingend zu 100% erfüllt sein. Sie dienen als Orientierung zur Qualitätssicherung und helfen dabei, potenzielle Risiken frühzeitig zu erkennen.

## Definition of Done (DoD)

> **Hinweis:** Die Definition of Done wird idealerweise im Team erarbeitet und kann projektspezifisch angepasst werden. Die folgenden Punkte dienen als Vorschlag.

- [ ] Alle Akzeptanzkriterien sind erfüllt und getestet
- [ ] Die Middleware ist als wiederverwendbare Funktion implementiert (z.B. `src/middleware/validateApiKey.ts`)
- [ ] Unit-Tests decken alle Validierungsszenarien ab (mind. 80% Code Coverage)
- [ ] Die Middleware ist in mindestens einer Firebase Function erfolgreich integriert (z.B. `getUploadUrls`)
- [ ] Code Review durch mindestens 1 Entwickler wurde durchgeführt und Feedback eingearbeitet
- [ ] Die Implementierung folgt den TypeScript Best Practices und ESLint-Regeln des Projekts
- [ ] Fehlerbehandlung und Logging sind implementiert (strukturierte Logs für Debugging)
- [ ] Die Middleware ist in der technischen Dokumentation beschrieben (inkl. Verwendungsbeispiel)
- [ ] Keine offenen Bugs oder kritischen Code-Smells (SonarQube/ESLint Check erfolgreich)
- [ ] Die Änderungen sind in den `main` Branch gemerged
