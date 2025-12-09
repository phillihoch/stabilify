# Story 08: Netzwerk-Request-Erfassung

**Phase:** Enhanced  
**Priorität:** Mittel  
**Abhängigkeiten:** Story 07 (Auto-Fixture)

---

## Beschreibung

**WHO:** Als QA-Engineer oder Entwickler

**WHAT:** Möchte ich, dass das Auto-Fixture alle Netzwerk-Requests während des Tests erfasst (URL, Methode, Status-Code)

**WHY:** Damit ich bei Testfehlern sehen kann, ob API-Aufrufe fehlgeschlagen sind oder unerwartete Responses geliefert haben

---

## Akzeptanzkriterien (Confirmation)

- [ ] Alle Netzwerk-Requests werden über `page.on('response')` erfasst
- [ ] Pro Request werden folgende Informationen gespeichert:
  - URL des Requests
  - HTTP-Methode (GET, POST, PUT, DELETE, etc.)
  - HTTP-Status-Code
  - Zeitstempel des Requests
- [ ] Requests werden in chronologischer Reihenfolge gespeichert
- [ ] Fehlgeschlagene Requests (Status >= 400) werden markiert
- [ ] Optionale Filterung möglich (z.B. nur API-Requests, keine Assets)
- [ ] Die Netzwerk-Daten werden in der `runtime.networkRequests`-Struktur gespeichert

---

## INVEST-Check

| Kriterium | Erfüllt | Begründung |
|-----------|---------|------------|
| **Independent** – Kann die Story eigenständig umgesetzt werden? | ⚠️ Teilweise | Erweitert Auto-Fixture aus Story 07 |
| **Negotiable** – Gibt es Raum für Diskussion und Anpassungen? | ✅ Ja | Welche Request-Details erfasst werden |
| **Valuable** – Liefert die Story einen klaren Nutzen für den Benutzer? | ✅ Ja | API-Fehler sind häufige Fehlerursachen |
| **Estimable** – Kann der Aufwand vom Team geschätzt werden? | ✅ Ja | Event-Listener-Pattern bekannt |
| **Small** – Ist die Story klein genug für eine Iteration? | ✅ Ja | Fokus nur auf Network-Events |
| **Testable** – Sind die Erfolgskriterien klar definiert? | ✅ Ja | Request-Daten können verifiziert werden |

---

## Technische Hinweise

- Nutzung von `page.on('response')` für abgeschlossene Requests
- Optional: `page.on('request')` für ausgehende Requests
- `response.url()`, `response.status()`, `response.request().method()`
- Achtung: Große Anzahl an Requests bei Asset-lastigen Seiten

---

## Beispiel-Datenstruktur

```typescript
interface NetworkRequest {
  url: string;
  method: string;
  status: number;
  timestamp: string;
  failed: boolean;
}

// In runtime:
networkRequests: NetworkRequest[]
```

---

## Filter-Optionen (Erweiterung)

Mögliche Filter für spätere Erweiterung:
- Nur XHR/Fetch-Requests
- URL-Pattern-Matching
- Nur fehlgeschlagene Requests

---

## Definition of Done

- [ ] Code implementiert und Code-Review durchgeführt
- [ ] Alle Akzeptanzkriterien sind getestet
- [ ] Unit-Tests für Network-Erfassung vorhanden
- [ ] Performance-Test bei vielen Requests
- [ ] `runtime.networkRequests` in Datenstruktur integriert

