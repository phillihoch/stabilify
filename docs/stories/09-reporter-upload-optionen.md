# 9. Reporter-Konfiguration um Upload-Optionen erweitern

## Beschreibung

**WHO:** Als Entwickler, der Stabilify in meinem Playwright-Projekt nutzt

**WHAT:** Möchte ich den Reporter um Upload-Optionen erweitern können, sodass Failures und Test-Run Metadaten automatisch an den Stabilify-Server übertragen werden

**WHY:** Damit ich Test-Failures zentral sammeln, Test-Runs tracken, analysieren und im Team teilen kann, ohne manuell Dateien hochladen zu müssen

## Akzeptanzkriterien (Confirmation)

- Die Reporter-Konfiguration unterstützt ein optionales `upload`-Objekt mit folgenden Eigenschaften:

  - `enabled` (boolean): Aktiviert/deaktiviert den Upload
  - `apiKey` (string): API-Schlüssel für die Authentifizierung (kann aus Umgebungsvariable gelesen werden)
  - `endpoint` (string, optional): Server-URL (Standard: `https://api.stabilify.dev`)
  - `retryAttempts` (number, optional): Anzahl der Wiederholungsversuche bei Fehlern (Standard: 3)
  - `retryDelayMs` (number, optional): Verzögerung zwischen Wiederholungen in Millisekunden (Standard: 1000)

- Die Konfiguration kann in der `playwright.config.ts` wie folgt definiert werden:

  ```typescript
  reporter: [
    [
      "stabilify/reporter",
      {
        upload: {
          enabled: true,
          apiKey: process.env.STABILIFY_API_KEY,
          endpoint: "https://api.stabilify.dev",
          retryAttempts: 3,
          retryDelayMs: 1000,
        },
      },
    ],
  ];
  ```

- Wenn `upload.enabled` auf `false` gesetzt oder das `upload`-Objekt nicht definiert ist, verhält sich der Reporter wie bisher (nur lokale Speicherung)

- Der API-Key kann sowohl direkt als String als auch über Umgebungsvariablen (z.B. `process.env.STABILIFY_API_KEY`) konfiguriert werden

- Die TypeScript-Typdefinitionen für `SelfHealingReporterOptions` werden um die Upload-Konfiguration erweitert

- Bei fehlender oder ungültiger Konfiguration (z.B. `enabled: true` aber kein `apiKey`) wird eine aussagekräftige Fehlermeldung ausgegeben

- Die Konfiguration wird beim Reporter-Start validiert und bei Fehlern wird der Upload deaktiviert mit entsprechender Warnung

- **Test-Run Tracking:**
  - Der Reporter generiert beim Start eine eindeutige `reportId` (UUID) für den gesamten Test-Run
  - Der Reporter sammelt CI/CD Metadaten aus Umgebungsvariablen:
    - Git Branch (z.B. aus `GITHUB_REF`, `CI_COMMIT_BRANCH`)
    - Git Commit Hash (z.B. aus `GITHUB_SHA`, `CI_COMMIT_SHA`)
    - CI Job ID (z.B. aus `GITHUB_RUN_ID`, `CI_JOB_ID`)
    - CI Provider wird automatisch erkannt (GitHub Actions, GitLab CI, Jenkins, etc.)
  - Der Reporter trackt Test-Statistiken während des Runs (totalTests, failedTests, passedTests, skippedTests)
  - Die `reportId` wird bei allen Failures dieses Runs mitgesendet

## INVEST-Check

**Independent – Kann die Story eigenständig umgesetzt werden?**
✅ Ja. Die Story erweitert nur die Konfigurationsschnittstelle des Reporters und hat keine Abhängigkeiten zu anderen Stories. Die Upload-Logik selbst wird in separaten Stories implementiert.

**Negotiable – Gibt es Raum für Diskussion und Anpassungen?**
✅ Ja. Die genauen Standardwerte für `retryAttempts` und `retryDelayMs` können angepasst werden. Auch die Struktur des `upload`-Objekts kann bei Bedarf erweitert werden (z.B. um Timeout-Einstellungen).

**Valuable – Liefert die Story einen klaren Nutzen für den Benutzer?**
✅ Ja. Entwickler können den Upload-Mechanismus einfach konfigurieren und aktivieren, was die Grundlage für die zentrale Failure-Verwaltung bildet.

**Estimable – Kann der Aufwand vom Team geschätzt werden?**
✅ Ja. Es handelt sich um eine überschaubare Erweiterung der TypeScript-Interfaces, Konfigurationsvalidierung und Test-Run Tracking. Aufwand: ca. 4-6 Stunden.

**Small – Ist die Story klein genug für eine Iteration?**
✅ Ja. Die Story fokussiert sich ausschließlich auf die Konfigurationserweiterung ohne die eigentliche Upload-Implementierung.

**Testable – Sind die Erfolgskriterien klar definiert?**
✅ Ja. Die Akzeptanzkriterien definieren klar überprüfbare Bedingungen:

- Konfiguration kann gesetzt werden
- Validierung funktioniert
- Fehlermeldungen werden ausgegeben
- TypeScript-Typen sind korrekt

## Definition of Done (DoD)

- [ ] TypeScript-Interface `SelfHealingReporterOptions` wurde um das `upload`-Objekt erweitert
- [ ] Alle Upload-Optionen (`enabled`, `apiKey`, `endpoint`, `retryAttempts`, `retryDelayMs`) sind im Interface definiert
- [ ] Standardwerte für optionale Felder sind dokumentiert
- [ ] **Test-Run Tracking ist implementiert:**
  - [ ] reportId (UUID) wird beim Reporter-Start generiert
  - [ ] CI/CD Metadaten werden aus Umgebungsvariablen gesammelt (Branch, Commit, CI-Job-ID)
  - [ ] CI Provider wird automatisch erkannt (GitHub Actions, GitLab CI, Jenkins, CircleCI)
  - [ ] Test-Statistiken werden während des Runs getrackt
  - [ ] reportId wird bei allen Failures mitgesendet
- [ ] Konfigurationsvalidierung ist implementiert und testet:
  - Fehlenden API-Key bei aktiviertem Upload
  - Ungültige Werte für `retryAttempts` und `retryDelayMs`
- [ ] Aussagekräftige Fehlermeldungen werden bei ungültiger Konfiguration ausgegeben
- [ ] Unit-Tests für die Konfigurationsvalidierung und Test-Run Tracking sind geschrieben und bestehen
- [ ] Dokumentation in README.md wurde um Upload-Konfigurationsbeispiele und Test-Run Tracking ergänzt
- [ ] Code-Review durch mindestens 1 Entwickler ist erfolgt
- [ ] Alle TypeScript-Compiler-Fehler sind behoben
- [ ] Die Änderungen sind in den main-Branch gemergt
