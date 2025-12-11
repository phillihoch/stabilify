# 4. Firestore onCreate Trigger für Failure-Analyse implementieren

## Beschreibung

**WHO:** Als Entwickler des Stabilify-Systems

**WHAT:** Möchte ich einen Firestore onCreate Trigger implementieren, der automatisch bei jedem neu erstellten Failure-Dokument eine asynchrone KI-Analyse startet

**WHY:** Damit Testfehler automatisch analysiert werden und Lösungsvorschläge generiert werden, ohne dass der Client auf die Analyse warten muss oder manuelle Schritte erforderlich sind

## Akzeptanzkriterien (Confirmation)

- Der Trigger wird automatisch ausgelöst, sobald ein neues Dokument in der `failures` Collection erstellt wird
- Der Trigger lädt die vollständigen Failure-Daten aus Firestore (inkl. Fehlerkontext, Stack Traces, Steps)
- Der Trigger ruft einen konfigurierbaren AI-Provider (OpenAI oder Gemini) auf, basierend auf den Tenant-Einstellungen
- Die AI-Analyse liefert: Root Cause, Kategorie, Confidence-Score, Lösungsstrategie und optional Code-Vorschläge
- Das Ergebnis wird als neues Dokument in der `solutions` Collection gespeichert mit Referenz zur `failureId`
- Der `analysisStatus` im Failure-Dokument wird von "pending" auf "analyzing" und schließlich auf "completed" oder "failed" aktualisiert
- Bei Fehlern in der Analyse wird der Status auf "failed" gesetzt und der Fehler wird geloggt
- Token-Usage und Processing-Time werden in der Solution gespeichert für Monitoring und Kostenanalyse
- Die Funktion ist idempotent: Mehrfaches Triggern für dasselbe Failure führt nicht zu Duplikaten

## INVEST-Check

**Independent – Kann die Story eigenständig umgesetzt werden?**
✅ Ja. Die Story baut auf der bestehenden Firestore-Struktur auf (tenants, failures, solutions Collections), benötigt aber keine Änderungen an anderen Komponenten. Der Trigger arbeitet vollständig asynchron und unabhängig vom Upload-Flow.

**Negotiable – Gibt es Raum für Diskussion und Anpassungen?**
✅ Ja. Details wie Prompt-Engineering, Retry-Strategie bei AI-Fehlern, Timeout-Werte und die genaue Struktur der Solution-Daten können im Team diskutiert und angepasst werden.

**Valuable – Liefert die Story einen klaren Nutzen für den Benutzer?**
✅ Ja. Die automatische Analyse ist der Kernwert von Stabilify. Entwickler erhalten ohne manuellen Aufwand konkrete Lösungsvorschläge für fehlgeschlagene Tests.

**Estimable – Kann der Aufwand vom Team geschätzt werden?**
✅ Ja. Die Implementierung umfasst: Firestore Trigger Setup, AI-Provider Integration (OpenAI/Gemini SDK), Prompt-Erstellung, Error Handling und Status-Updates. Aufwand: ca. 3-4 Tage.

**Small – Ist die Story klein genug für eine Iteration?**
✅ Ja. Die Story fokussiert sich ausschließlich auf den Trigger und die AI-Analyse. Upload-Flow und Dashboard sind separate Stories.

**Testable – Sind die Erfolgskriterien klar definiert?**
✅ Ja. Erfolg kann durch Unit-Tests (Trigger-Logik), Integration-Tests (Firestore onCreate Event simulieren) und manuelle Tests (echtes Failure erstellen und Solution prüfen) verifiziert werden.

**Hinweis:** Nicht alle INVEST-Kriterien müssen zwingend zu 100% erfüllt sein. Sie dienen als Orientierung für die Story-Qualität und können im Refinement diskutiert werden.

## Definition of Done (DoD)

_Hinweis: Die Definition of Done wird idealerweise im Team erarbeitet und kann projektspezifisch angepasst werden._

- [ ] Alle Akzeptanzkriterien sind erfüllt und getestet
- [ ] Firestore Trigger `analyzeFailure` ist implementiert und deployed
- [ ] Integration mit mindestens einem AI-Provider (OpenAI oder Gemini) ist funktionsfähig
- [ ] Error Handling ist implementiert (Logging, Status-Updates bei Fehlern)
- [ ] Unit-Tests für die Analyse-Logik sind geschrieben und bestehen
- [ ] Integration-Tests mit simulierten Firestore Events sind geschrieben und bestehen
- [ ] Code wurde durch mindestens 1 Entwickler reviewed
- [ ] Dokumentation der Trigger-Funktion ist vorhanden (Kommentare, README-Update)
- [ ] Monitoring/Logging ist eingerichtet (Token-Usage, Processing-Time, Fehlerrate)
- [ ] Manuelle End-to-End-Tests wurden erfolgreich durchgeführt (Failure erstellen → Solution prüfen)
- [ ] Keine kritischen Bugs oder offenen Issues
