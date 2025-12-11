# 6. TypeScript Interfaces für Firestore Collections definieren

## Beschreibung

**WHO:** Als Backend-Entwickler

**WHAT:** Möchte ich typsichere TypeScript Interfaces für alle Firestore Collections (tenants, testRuns, apiKeys, failures, solutions) definieren

**WHY:** Damit ich eine konsistente Datenstruktur zwischen Client und Server gewährleiste, Typfehler zur Compile-Zeit erkenne und die Wartbarkeit des Codes verbessere

## Akzeptanzkriterien (Confirmation)

- TypeScript Interfaces für alle fünf Firestore Collections (tenants, testRuns, apiKeys, failures, solutions) sind gemäß Architekturplan definiert
- **TestRun Interface** ist vollständig implementiert mit:
  - reportId (UUID) als Primärschlüssel
  - CI/CD Metadaten (branch, commit, ciJobId, ciProvider)
  - Test-Statistiken (totalTests, failedTests, passedTests, skippedTests)
  - Timing-Informationen (startedAt, completedAt, duration)
  - Status-Tracking (running, completed, failed, cancelled)
- **Failure Interface** enthält `reportId` als Referenz zum TestRun
- Alle Interfaces enthalten die im Architekturplan spezifizierten Felder mit korrekten Typen (inkl. Timestamp, Arrays, verschachtelte Objekte)
- Enums für wiederkehrende Werte sind definiert (z.B. ApiKeyScope, FailureStatus, SolutionCategory, TestRunStatus)
- Die Interfaces sind in einer zentralen Datei (z.B. `src/types/firestore.ts`) organisiert und exportiert
- Alle Felder sind korrekt als required oder optional (?) gekennzeichnet
- JSDoc-Kommentare dokumentieren den Zweck jedes Interface und nicht-offensichtlicher Felder

## INVEST-Check

**Independent – Kann die Story eigenständig umgesetzt werden?**
✅ Ja. Die Story erfordert nur die Erstellung von TypeScript-Definitionen basierend auf dem vorhandenen Architekturplan. Es gibt keine Abhängigkeiten zu anderen Stories.

**Negotiable – Gibt es Raum für Diskussion und Anpassungen?**
✅ Ja. Die genaue Dateistruktur (eine vs. mehrere Dateien), Namenskonventionen und der Umfang der JSDoc-Dokumentation können diskutiert werden.

**Valuable – Liefert die Story einen klaren Nutzen für den Benutzer?**
✅ Ja. Typsicherheit reduziert Laufzeitfehler, verbessert die Developer Experience durch IntelliSense und erleichtert Refactorings.

**Estimable – Kann der Aufwand vom Team geschätzt werden?**
✅ Ja. Es handelt sich um eine klar abgegrenzte Aufgabe mit definiertem Umfang (5 Collections, bekannte Felder aus Architekturplan).

**Small – Ist die Story klein genug für eine Iteration?**
✅ Ja. Die Implementierung sollte in 2-3 Stunden abgeschlossen sein (inkl. TestRun Interface).

**Testable – Sind die Erfolgskriterien klar definiert?**
✅ Ja. Die Akzeptanzkriterien sind überprüfbar: Interfaces existieren, enthalten alle Felder, TypeScript kompiliert ohne Fehler.

## Definition of Done (DoD)

- Alle TypeScript Interfaces sind implementiert und exportiert
- TypeScript kompiliert ohne Fehler oder Warnungen
- Alle Felder aus dem Architekturplan sind vollständig abgebildet
- JSDoc-Kommentare sind für alle Interfaces vorhanden
- Code folgt den Projekt-Coding-Standards (Linting, Formatierung)
- Review durch mindestens 1 Entwickler erfolgt
