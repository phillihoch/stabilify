# 7. API Key Generator und Hasher Utility implementieren

## Beschreibung

**WHO:** Als Backend-Entwickler

**WHAT:** Möchte ich eine Utility-Funktion zur Generierung und zum Hashen von API Keys implementieren

**WHY:** Damit API Keys sicher im Format `sk_live_xxx` oder `sk_test_xxx` generiert und als SHA-256 Hash in Firestore gespeichert werden können, ohne den Klartext-Key jemals zu persistieren

## Akzeptanzkriterien (Confirmation)

- Eine Funktion `generateApiKey(environment: 'live' | 'test')` generiert API Keys im Format `sk_{environment}_{32 Zeichen Base62}`
- Die generierten Keys verwenden kryptografisch sichere Zufallswerte (z.B. `crypto.randomBytes`)
- Eine Funktion `hashApiKey(apiKey: string)` erstellt einen SHA-256 Hash des übergebenen Keys
- Der Hash wird als Hexadezimal-String zurückgegeben und kann als Firestore Document ID verwendet werden
- Eine Funktion `extractKeyPrefix(apiKey: string)` extrahiert die ersten 8 Zeichen zur Identifikation (z.B. `sk_live_a`)
- Alle Funktionen sind mit Unit-Tests abgedeckt, die verschiedene Szenarien testen (Eindeutigkeit, Format, Hash-Konsistenz)
- Die Utility-Funktionen sind als wiederverwendbares Modul exportiert und können sowohl in Cloud Functions als auch in Admin-Scripts verwendet werden

## INVEST-Check

**Independent – Kann die Story eigenständig umgesetzt werden?**
✅ Ja. Die Story benötigt keine Abhängigkeiten zu anderen Stories und kann isoliert implementiert werden.

**Negotiable – Gibt es Raum für Diskussion und Anpassungen?**
✅ Ja. Das Key-Format, die Hash-Funktion und die Länge der Keys können bei Bedarf angepasst werden.

**Valuable – Liefert die Story einen klaren Nutzen für den Benutzer?**
✅ Ja. Die Utility-Funktionen sind die Grundlage für die sichere API-Key-Verwaltung im gesamten System.

**Estimable – Kann der Aufwand vom Team geschätzt werden?**
✅ Ja. Die Implementierung ist klar definiert und umfasst Generierung, Hashing und Tests.

**Small – Ist die Story klein genug für eine Iteration?**
✅ Ja. Die Story fokussiert sich ausschließlich auf die Utility-Funktionen ohne Integration in andere Komponenten.

**Testable – Sind die Erfolgskriterien klar definiert?**
✅ Ja. Die Akzeptanzkriterien definieren eindeutig überprüfbare Anforderungen an Format, Sicherheit und Funktionalität.

## Definition of Done (DoD)

- Alle Akzeptanzkriterien sind erfüllt und getestet
- Unit-Tests für alle Utility-Funktionen sind implementiert und bestehen
- Code folgt den Projekt-Coding-Standards (TypeScript, ESLint)
- Funktionen sind mit JSDoc-Kommentaren dokumentiert
- Code-Review durch mindestens 1 Entwickler ist erfolgt
- Keine offenen Sicherheitslücken oder Code-Smells in der statischen Analyse
