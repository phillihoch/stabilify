# User Story: getUploadUrls Function implementieren

## Beschreibung

**WHO:** Als Entwickler des Stabilify-Servers

**WHAT:** Möchte ich eine Firebase Cloud Function `getUploadUrls` implementieren, die signierte Upload-URLs für Test-Dateien generiert

**WHY:** Damit der Reporter-Client Dateien (Screenshots, Traces, Videos) sicher und performant direkt in Cloud Storage hochladen kann, ohne komplexe Storage Rules zu benötigen

## Akzeptanzkriterien (Confirmation)

- Die Function validiert den API Key aus dem `x-api-key` Header durch SHA-256 Hashing und Firestore-Lookup
- Die Function prüft, ob der API Key aktiv ist, nicht abgelaufen ist und den Scope `storage:write` besitzt
- Die Function generiert für jede angeforderte Datei eine signierte PUT-URL mit 15 Minuten Gültigkeit
- Die signierten URLs enthalten serverseitig vordefinierte Metadaten (`x-goog-meta-tenant-id`, `x-goog-meta-test-id`, `x-goog-meta-file-type`, `x-goog-meta-uploaded-at`), die vom Client nicht manipuliert werden können
- Die Function gibt die Tenant-ID, Upload-URLs, Ziel-Pfade und Ablaufzeitpunkt im Response zurück
- Bei fehlenden oder ungültigen API Keys werden entsprechende HTTP-Statuscodes (401, 403) zurückgegeben
- Die Function aktualisiert `lastUsedAt` und `usageCount` des verwendeten API Keys
- Die Dateipfade folgen der Konvention: `{tenantId}/{testId}/{fileName}`

## INVEST-Check

**Independent – Kann die Story eigenständig umgesetzt werden?**
✅ **Ja** – Die Story setzt voraus, dass die Firestore Collections `apiKeys` und `tenants` bereits existieren (Phase 1 der Roadmap). Die Function ist unabhängig von anderen Functions implementierbar.

**Negotiable – Gibt es Raum für Diskussion und Anpassungen?**
✅ **Ja** – Details wie die URL-Gültigkeitsdauer (aktuell 15 Minuten), die genauen Metadaten-Felder oder das Error-Handling können im Team diskutiert und angepasst werden.

**Valuable – Liefert die Story einen klaren Nutzen für den Benutzer?**
✅ **Ja** – Die Function ermöglicht einen sicheren, performanten Upload-Mechanismus ohne komplexe Storage Rules. Sie ist die Grundlage für den gesamten Datei-Upload-Flow.

**Estimable – Kann der Aufwand vom Team geschätzt werden?**
✅ **Ja** – Die Implementierung umfasst API-Key-Validierung, Signierte-URL-Generierung und Error-Handling. Der Aufwand ist klar abschätzbar (ca. 1-2 Tage laut Roadmap).

**Small – Ist die Story klein genug für eine Iteration?**
✅ **Ja** – Die Story fokussiert sich ausschließlich auf die `getUploadUrls` Function und ist in einer Iteration umsetzbar.

**Testable – Sind die Erfolgskriterien klar definiert?**
✅ **Ja** – Die Akzeptanzkriterien sind überprüfbar durch Unit-Tests (API-Key-Validierung, URL-Generierung) und Integrationstests (End-to-End-Upload-Flow).

> **Hinweis:** Nicht alle INVEST-Kriterien müssen zwingend zu 100% erfüllt sein. Sie dienen als Orientierung für die Story-Qualität im Refinement.

## Definition of Done (DoD)

- [ ] Alle Akzeptanzkriterien sind erfüllt und getestet
- [ ] Unit-Tests für API-Key-Validierung (gültig, ungültig, inaktiv, abgelaufen, fehlender Scope) sind implementiert und bestehen
- [ ] Integrationstests für die URL-Generierung mit echtem Cloud Storage sind implementiert und bestehen
- [ ] Error-Handling für alle Fehlerfälle (401, 403) ist implementiert und getestet
- [ ] Code-Review durch mindestens 1 Entwickler ist erfolgt
- [ ] Dokumentation der API-Endpunkte (Request/Response-Schema) ist aktualisiert
- [ ] Die Function ist in Firebase Functions deployed und funktioniert in der Staging-Umgebung
- [ ] Logging für Debugging und Monitoring ist implementiert

> **Erinnerung:** Die Definition of Done wird im Team erarbeitet und kann projektspezifisch angepasst werden.
