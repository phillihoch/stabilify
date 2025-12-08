# User Story 4: Heuristische Vorfilterung und Performance-Optimierung

## Beschreibung

**WHO:** Als Test-Automatisierungs-System

**WHAT:** Möchte ich deterministische Heuristiken implementieren, die häufige Selektor-Änderungen schnell erkennen und beheben, bevor die teure AI konsultiert wird

**WHY:** Damit die Testausführung performant bleibt und API-Kosten minimiert werden, indem triviale Änderungen in Millisekunden statt Sekunden gelöst werden

---

## Akzeptanzkriterien

### 1. Heuristische Vorfilter-Pipeline
- Eine `HeuristicHealer`-Klasse ist implementiert mit einer `attemptHeal()`-Methode
- Die Methode wird VOR dem `AIHealer` im Proxy-Interceptor aufgerufen
- Die Methode gibt `Promise<string | null>` zurück (neuer Selektor oder null)
- Ausführungszeit ist < 100ms pro Versuch

### 2. ID-Änderungs-Heuristik
- Erkennung von Mustern wie `#submit-123` → `#submit-456`
- Regex-basierte Suche nach ähnlichen IDs im DOM
- Validierung, dass das gefundene Element ähnliche Attribute hat (z.B. gleicher Tag, ähnlicher Text)
- Priorisierung von Elementen mit gleicher Position im DOM-Tree

### 3. Nachbarschaftsanalyse
- Wenn ein Selektor auf Verschachtelung basiert (z.B. `div > span > button`), wird geprüft:
  - Existiert die Parent-Struktur noch?
  - Hat sich nur die Tiefe der Verschachtelung geändert?
  - Gibt es ein ähnliches Element in der Nähe?
- Verwendung von `page.locator()` mit relaxierten Selektoren (z.B. ohne strikte Hierarchie)

### 4. Attribut-Fuzzy-Matching
- Suche nach Elementen mit ähnlichen Attributen:
  - Gleicher `data-testid` mit Suffix/Prefix-Variation
  - Gleicher Text-Content
  - Gleiche ARIA-Rolle
- Levenshtein-Distanz oder ähnliche Algorithmen für Text-Matching

### 5. Viewport Cropping für AI-Fallback
- Wenn Heuristiken fehlschlagen und AI gerufen wird:
  - Screenshot wird auf den sichtbaren Viewport beschränkt (statt Full-Page)
  - Wenn bekannt, wird der Bereich um das zuletzt bekannte Element gecroppt
- Reduzierung der Bildgröße um mindestens 50% im Durchschnitt

### 6. Resolution Switching
- Konfigurierbare Nutzung von OpenAI `detail: "low"` vs. `detail: "high"` Modus
- Standardmäßig wird `low` für große Elemente (Buttons, Modals) verwendet
- `high` wird nur für kleine oder komplexe Elemente genutzt
- Automatische Entscheidung basierend auf Element-Typ (falls bekannt)

### 7. Performance-Metriken
- Logging der Ausführungszeit für jede Heuristik
- Logging der Erfolgsrate (Heuristik vs. AI vs. Fehlschlag)
- Aggregierte Statistiken am Ende des Testlaufs

---

## Definition of Done

- [ ] `HeuristicHealer`-Klasse ist implementiert
- [ ] Mindestens 3 Heuristiken sind implementiert und getestet:
  - ID-Änderungs-Heuristik
  - Nachbarschaftsanalyse
  - Attribut-Fuzzy-Matching
- [ ] Integration in Proxy-Interceptor (vor AI-Call)
- [ ] Viewport Cropping ist implementiert
- [ ] Resolution Switching ist konfigurierbar
- [ ] Performance-Metriken werden geloggt
- [ ] Unit-Tests für jede Heuristik (min. 80% Coverage)
- [ ] Integration-Tests zeigen < 100ms Ausführungszeit für Heuristiken
- [ ] Benchmark-Vergleich: Heuristik vs. AI (Geschwindigkeit und Erfolgsrate)
- [ ] Code-Review durch mindestens 1 Engineer
- [ ] Dokumentation der Heuristiken und Konfigurationsoptionen
- [ ] Keine Regression in bestehenden Tests

