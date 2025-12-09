# Story 10: Webhook/HTTP-Export-Funktionalität

**Phase:** Enhanced  
**Priorität:** Hoch  
**Abhängigkeiten:** Story 05 (JSON-Output)

---

## Beschreibung

**WHO:** Als DevOps-Engineer oder Entwickler

**WHAT:** Möchte ich, dass die gesammelten Fehlerdaten am Ende des Testlaufs automatisch an einen konfigurierbaren HTTP-Webhook gesendet werden

**WHY:** Damit ich die Fehlerdaten in Echtzeit an externe Systeme (z.B. Analyse-Service, Slack, CI/CD-Pipeline) übertragen kann, ohne manuelle Dateien verarbeiten zu müssen

---

## Akzeptanzkriterien (Confirmation)

- [ ] Die Webhook-URL ist über Umgebungsvariable oder Konfiguration einstellbar
- [ ] Die Fehlerdaten werden als JSON im HTTP-POST-Body gesendet
- [ ] Der Content-Type Header ist `application/json`
- [ ] Bei Webhook-Fehlern wird eine Warnung ausgegeben, der Testlauf aber nicht abgebrochen
- [ ] Optional: Retry-Logik bei temporären Netzwerkfehlern (max. 3 Versuche)
- [ ] Optional: Authentifizierung via Bearer-Token oder API-Key Header
- [ ] Der Webhook-Aufruf erfolgt nur, wenn Fehler vorhanden sind
- [ ] Timeout für den HTTP-Request ist konfigurierbar (Standard: 30 Sekunden)

---

## INVEST-Check

| Kriterium | Erfüllt | Begründung |
|-----------|---------|------------|
| **Independent** – Kann die Story eigenständig umgesetzt werden? | ⚠️ Teilweise | Benötigt gesammelte Daten |
| **Negotiable** – Gibt es Raum für Diskussion und Anpassungen? | ✅ Ja | Auth-Methode, Retry-Verhalten |
| **Valuable** – Liefert die Story einen klaren Nutzen für den Benutzer? | ✅ Ja | Ermöglicht Echtzeit-Integration |
| **Estimable** – Kann der Aufwand vom Team geschätzt werden? | ✅ Ja | HTTP-Client-Implementierung bekannt |
| **Small** – Ist die Story klein genug für eine Iteration? | ✅ Ja | Fokus auf HTTP-Versand |
| **Testable** – Sind die Erfolgskriterien klar definiert? | ✅ Ja | HTTP-Aufruf kann gemockt werden |

---

## Technische Hinweise

- Native `fetch()` in Node.js 18+ verfügbar
- Alternative: `node-fetch` oder `axios` für ältere Node-Versionen
- Umgebungsvariablen:
  - `SELF_HEALING_WEBHOOK_URL`
  - `SELF_HEALING_WEBHOOK_TOKEN`

---

## Beispiel-Konfiguration

```typescript
// Umgebungsvariablen
SELF_HEALING_WEBHOOK_URL=https://api.example.com/test-failures
SELF_HEALING_WEBHOOK_TOKEN=secret-token

// Oder in playwright.config.ts
reporter: [
  ['./self-healing-reporter.ts', {
    webhookUrl: 'https://api.example.com/test-failures',
    webhookToken: process.env.WEBHOOK_TOKEN,
    webhookTimeout: 30000,
  }]
]
```

---

## Beispiel HTTP-Request

```http
POST /test-failures HTTP/1.1
Host: api.example.com
Content-Type: application/json
Authorization: Bearer secret-token

[
  { "testId": "...", "title": "...", ... }
]
```

---

## Definition of Done

- [ ] Code implementiert und Code-Review durchgeführt
- [ ] Alle Akzeptanzkriterien sind getestet
- [ ] Unit-Tests mit gemocktem HTTP-Server
- [ ] Integration-Test mit echtem Webhook-Endpunkt
- [ ] Fehlerbehandlung dokumentiert
- [ ] Konfigurationsoptionen dokumentiert

