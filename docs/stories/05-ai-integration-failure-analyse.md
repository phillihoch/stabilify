# User Story: AI-Integration für Failure-Analyse

## Beschreibung

**WHO:** Als Entwickler, der Stabilify zur automatischen Testfehler-Analyse nutzt

**WHAT:** Möchte ich, dass fehlgeschlagene Tests automatisch durch eine KI analysiert werden und konkrete Lösungsvorschläge erhalten

**WHY:** Damit ich schneller die Ursache von Testfehlern verstehe und weniger Zeit mit manueller Fehlersuche verbringe

## Akzeptanzkriterien (Confirmation)

- **AC1 - Automatische Trigger-Verarbeitung:** Wenn ein neues Failure-Dokument in Firestore erstellt wird, wird automatisch eine Cloud Function (`analyzeFailure`) ausgelöst, die den Analyseprozess startet
- **AC2 - KI-Analyse mit Google Genkit:** Die Analyse nutzt Google Genkit zur Integration mit einem konfigurierbaren AI-Modell (OpenAI GPT-4o oder Google Gemini 1.5 Pro), wobei die Modellwahl aus den Tenant-Einstellungen (`settings.defaultAiModel`) geladen wird
- **AC3 - Strukturierte Fehleranalyse:** Die KI erhält alle relevanten Failure-Informationen (Fehlermeldung, Stack Trace, Test-Steps, Screenshots-URLs, Trace-URLs) und liefert eine strukturierte Analyse mit:
  - Root Cause (Grundursache des Fehlers)
  - Category (selector | timing | data | logic | infrastructure)
  - Confidence Score (0-1)
  - Lösungsstrategie mit konkretem Code-Vorschlag
- **AC4 - Solution-Speicherung:** Das Analyse-Ergebnis wird als neues Dokument in der `solutions` Collection gespeichert mit Referenz zur `failureId` und `tenantId`
- **AC5 - Status-Tracking:** Der `analysisStatus` des Failure-Dokuments wird während des Prozesses aktualisiert:
  - `pending` → `analyzing` → `completed` (bei Erfolg)
  - `pending` → `analyzing` → `failed` (bei Fehler)
- **AC6 - Token-Usage-Tracking:** Die verwendeten AI-Tokens (Input/Output) und die Verarbeitungszeit werden in der Solution gespeichert für spätere Kostenanalyse
- **AC7 - Fehlerbehandlung:** Bei Fehlern während der Analyse (z.B. AI-API nicht erreichbar, ungültige Response) wird der Fehler geloggt, der Status auf `failed` gesetzt und die Verarbeitung gestoppt ohne das System zu blockieren

## INVEST-Check

**Independent – Kann die Story eigenständig umgesetzt werden?**
✅ **Ja** – Die Story baut auf der bestehenden Firestore-Struktur (`failures`, `solutions`, `tenants`) auf, die bereits definiert ist. Die Cloud Function kann unabhängig entwickelt und deployed werden.

**Negotiable – Gibt es Raum für Diskussion und Anpassungen?**
✅ **Ja** – Details wie Prompt-Engineering, Retry-Strategien bei AI-Fehlern, oder die genaue Struktur der Lösungsvorschläge können im Team diskutiert und angepasst werden.

**Valuable – Liefert die Story einen klaren Nutzen für den Benutzer?**
✅ **Ja** – Der Kernnutzen von Stabilify liegt in der automatischen Fehleranalyse. Diese Story liefert den zentralen Mehrwert: Entwickler erhalten konkrete, KI-generierte Lösungsvorschläge statt nur Fehlermeldungen.

**Estimable – Kann der Aufwand vom Team geschätzt werden?**
✅ **Ja** – Die Aufgabe ist klar umrissen: Firestore Trigger implementieren, Google Genkit integrieren, Prompt erstellen, Response parsen und speichern. Aufwand: ca. 3-4 Tage.

**Small – Ist die Story klein genug für eine Iteration?**
✅ **Ja** – Die Story fokussiert sich auf die Kern-Analyse-Funktion ohne zusätzliche Features wie Webhook-Benachrichtigungen oder Dashboard-Integration. Sie kann in einem Sprint (1-2 Wochen) umgesetzt werden.

**Testable – Sind die Erfolgskriterien klar definiert?**
✅ **Ja** – Die Akzeptanzkriterien sind überprüfbar durch:

- Unit-Tests für die Analyse-Logik
- Integration-Tests mit Mock-Failures
- Manuelle Tests mit echten Testfehler-Daten
- Überprüfung der gespeicherten Solutions in Firestore

**Hinweis:** Nicht alle INVEST-Kriterien müssen zu 100% erfüllt sein. Sie dienen als Orientierung für gute User Stories.

## Definition of Done (DoD)

_Hinweis: Die Definition of Done wird idealerweise im Team erarbeitet. Folgende Punkte sind Vorschläge basierend auf dieser Story:_

- [ ] Alle Akzeptanzkriterien (AC1-AC7) sind erfüllt und getestet
- [ ] Cloud Function `analyzeFailure` ist implementiert und deployed
- [ ] Google Genkit ist konfiguriert und funktioniert mit beiden AI-Providern (OpenAI, Gemini)
- [ ] Unit-Tests für die Analyse-Logik sind geschrieben und bestehen
- [ ] Integration-Tests mit Mock-Failure-Daten sind erfolgreich
- [ ] Error-Handling ist implementiert und getestet (z.B. AI-API Timeout)
- [ ] Code-Review durch mindestens 1 Entwickler ist erfolgt
- [ ] Dokumentation der Prompt-Struktur und AI-Integration ist erstellt
- [ ] Monitoring/Logging für die Function ist eingerichtet (z.B. Firebase Console)
- [ ] Token-Usage wird korrekt getrackt und gespeichert
- [ ] Manuelle End-to-End-Tests mit echten Failure-Daten wurden durchgeführt

## Technische Hinweise

### Google Genkit Integration

- Genkit ermöglicht flexible AI-Provider-Wahl (OpenAI, Gemini, etc.)
- Konfiguration erfolgt über `settings.defaultAiModel` im Tenant-Dokument
- Prompt-Engineering sollte iterativ optimiert werden

### Firestore Trigger

```typescript
// Beispiel-Struktur (keine vollständige Implementierung)
export const analyzeFailure = onDocumentCreated(
  "failures/{failureId}",
  async (event) => {
    // Analyse-Logik hier
  }
);
```

### Datenfluss

1. Neues Failure-Dokument wird erstellt → Trigger
2. Tenant-Settings laden → AI-Modell ermitteln
3. Failure-Daten + Media-URLs an AI senden
4. AI-Response parsen und validieren
5. Solution-Dokument erstellen
6. Failure-Status aktualisieren

## Abhängigkeiten

- Firestore Collections `failures`, `solutions`, `tenants` müssen existieren
- Google Genkit muss als Dependency installiert sein
- AI-Provider API-Keys müssen konfiguriert sein (OpenAI, Google AI)
