# 8. Tenant Quota Checker implementieren

## Beschreibung

**WHO:** Als Backend-Entwickler

**WHAT:** Möchte ich eine Quota-Prüfung für Tenants implementieren, die vor dem Speichern neuer Failures prüft, ob das monatliche Kontingent überschritten wurde

**WHY:** Damit Tenants nur innerhalb ihres gebuchten Plans Failures hochladen können und eine faire Ressourcennutzung gewährleistet ist

## Akzeptanzkriterien (Confirmation)

- Die `submitFailure` Function prüft vor dem Speichern, ob `tenant.failureCount >= tenant.failureQuota`
- Bei Quota-Überschreitung wird HTTP Status 429 (Too Many Requests) mit aussagekräftiger Fehlermeldung zurückgegeben
- Die Fehlermeldung enthält Informationen über aktuellen Plan, verbrauchte und verfügbare Failures
- Bei erfolgreicher Speicherung wird `tenant.failureCount` um die Anzahl der gespeicherten Failures erhöht
- Die Quota-Prüfung erfolgt atomar innerhalb einer Firestore-Transaktion, um Race Conditions zu vermeiden
- Ein Unit-Test validiert das Verhalten bei Quota-Überschreitung
- Ein Unit-Test validiert das korrekte Inkrementieren des Failure-Counters

## INVEST-Check

**Independent – Kann die Story eigenständig umgesetzt werden?**
✅ **Ja** – Die Story baut auf der bestehenden `submitFailure` Function und dem Tenant-Datenmodell auf. Alle notwendigen Strukturen (Tenant-Collection mit `failureQuota` und `failureCount`) sind bereits im Architekturplan definiert.

**Negotiable – Gibt es Raum für Diskussion und Anpassungen?**
✅ **Ja** – Details wie die genaue Struktur der Fehlermeldung, ob ein Soft-Limit mit Warnung vor dem Hard-Limit sinnvoll ist, oder ob ein Grace-Period-Mechanismus implementiert werden soll, können diskutiert werden.

**Valuable – Liefert die Story einen klaren Nutzen für den Benutzer?**
✅ **Ja** – Die Story stellt sicher, dass das SaaS-Geschäftsmodell funktioniert, indem Tenants nur innerhalb ihres gebuchten Plans Ressourcen nutzen können. Dies verhindert Missbrauch und ermöglicht faire Abrechnung.

**Estimable – Kann der Aufwand vom Team geschätzt werden?**
✅ **Ja** – Die Implementierung umfasst eine Firestore-Abfrage, eine Bedingungsprüfung, eine Transaktion und Unit-Tests. Der Aufwand ist klar abschätzbar (ca. 2-4 Stunden).

**Small – Ist die Story klein genug für eine Iteration?**
✅ **Ja** – Die Story fokussiert sich ausschließlich auf die Quota-Prüfung in der `submitFailure` Function und kann in einem Arbeitsschritt abgeschlossen werden.

**Testable – Sind die Erfolgskriterien klar definiert?**
✅ **Ja** – Die Akzeptanzkriterien definieren überprüfbare Bedingungen: HTTP 429 bei Überschreitung, korrektes Inkrementieren, atomare Transaktion, Unit-Tests.

**Hinweis:** Nicht alle INVEST-Kriterien müssen zwingend zu 100% erfüllt sein. Sie dienen als Orientierung für die Qualität der Story.

## Definition of Done (DoD)

_Hinweis: Die Definition of Done wird idealerweise im Team erarbeitet und kann projektspezifisch angepasst werden._

- [ ] Alle Akzeptanzkriterien sind implementiert und getestet
- [ ] Quota-Prüfung ist in `submitFailure` Function integriert
- [ ] Firestore-Transaktion verhindert Race Conditions beim Counter-Update
- [ ] HTTP 429 Response mit aussagekräftiger Fehlermeldung wird zurückgegeben
- [ ] Unit-Tests für Quota-Überschreitung sind geschrieben und bestehen
- [ ] Unit-Tests für korrektes Counter-Inkrement sind geschrieben und bestehen
- [ ] Code-Review durch mindestens 1 Entwickler erfolgt
- [ ] Dokumentation im Code (JSDoc/Kommentare) ist vorhanden
- [ ] Keine neuen Linter-Fehler oder Warnungen
- [ ] Änderungen sind in Git committed und gepusht
