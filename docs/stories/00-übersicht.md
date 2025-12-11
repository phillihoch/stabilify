# Stabilify Stories - Entwicklungsreihenfolge

Diese Übersicht zeigt die empfohlene Reihenfolge zur Implementierung der Stabilify Backend- und Client-Features basierend auf Abhängigkeiten und logischem Aufbau.

---

## 📋 Entwicklungsreihenfolge

### **Phase 1: Foundation** (Kritische Basis)

#### Story 06: TypeScript Interfaces für Firestore Collections

- **Kategorie:** Backend - Datenmodell & Utilities
- **Abhängigkeiten:** Keine
- **Warum zuerst?** Alle anderen Stories brauchen diese Typen als Grundlage
- **Umfang:**
  - `Tenant` Interface
  - `TestRun` Interface (NEU - für Test-Run Tracking)
  - `ApiKey` Interface
  - `Failure` Interface (mit `reportId` Referenz zu TestRun)
  - `Solution` Interface

#### Story 07: API Key Generator und Hasher Utility

- **Kategorie:** Backend - Datenmodell & Utilities
- **Abhängigkeiten:** Keine
- **Warum?** Wird für Tenant-Setup und API Key Validierung benötigt

---

### **Phase 2: Core Backend** (Ermöglicht erste Tests)

#### Story 01: API Key Validierungs-Middleware

- **Kategorie:** Backend - Firebase Functions
- **Abhängigkeiten:** Story 06 (Interfaces), Story 07 (Hasher)
- **Warum?** Alle Firebase Functions brauchen diese Middleware zur Authentifizierung

#### Story 02: getUploadUrls Function

- **Kategorie:** Backend - Firebase Functions
- **Abhängigkeiten:** Story 01 (Middleware), Story 06 (Interfaces)
- **Warum?** Erster Schritt im Upload-Flow - generiert signierte URLs

#### Story 03: submitFailure Function

- **Kategorie:** Backend - Firebase Functions
- **Abhängigkeiten:** Story 01 (Middleware), Story 06 (Interfaces)
- **Warum?** Zweiter Schritt im Upload-Flow - speichert Failure-Daten
- **Umfang:**
  - Failures in Firestore speichern
  - TestRun-Dokument erstellen (falls noch nicht vorhanden)
  - TestRun-Statistiken aktualisieren (failedTests, totalTests)
  - Storage-Dateien mit Failures verknüpfen
- **✅ Meilenstein:** Backend-Flow ist manuell testbar (z.B. mit curl/Postman)

---

### **Phase 3: Client Integration** (Kompletter E2E Flow)

#### Story 09: Reporter-Konfiguration um Upload-Optionen erweitern

- **Kategorie:** Client - Reporter Erweiterung
- **Abhängigkeiten:** Keine (kann parallel zu Backend entwickelt werden)
- **Warum?** Basis für Client-seitige Upload-Implementierung
- **Umfang:**
  - Upload-Konfiguration (apiKey, endpoint, etc.)
  - reportId-Generierung (UUID) beim Reporter-Start
  - CI/CD Metadaten sammeln (Branch, Commit, CI-Job-ID)
  - Test-Statistiken tracken (total, failed, passed)

#### Story 11: Datei-Sammler für Screenshots, Traces und Videos

- **Kategorie:** Client - Reporter Erweiterung
- **Abhängigkeiten:** Story 09 (Reporter Config)
- **Warum?** Sammelt die Dateien, die hochgeladen werden sollen

#### Story 10: Uploader-Modul für signierte URLs

- **Kategorie:** Client - Reporter Erweiterung
- **Abhängigkeiten:** Story 02 + 03 (Server-Endpoints), Story 11 (Datei-Sammler)
- **Warum?** Implementiert den kompletten Upload-Flow im Client
- **Umfang:**
  - Signierte URLs vom Server holen
  - Dateien hochladen
  - Failures mit reportId und Run-Metadaten senden
  - TestRun-Informationen übermitteln
- **✅ Meilenstein:** Kompletter Upload-Flow funktioniert End-to-End

---

### **Phase 4: Robustheit** (Produktionsreife)

#### Story 08: Tenant Quota Checker

- **Kategorie:** Backend - Datenmodell & Utilities
- **Abhängigkeiten:** Story 06 (Tenant Interface), Story 03 (submitFailure)
- **Warum?** Verhindert Quota-Überschreitungen und schützt vor Missbrauch

#### Story 12: Retry-Logik für Upload-Fehler

- **Kategorie:** Client - Reporter Erweiterung
- **Abhängigkeiten:** Story 10 (Uploader)
- **Warum?** Macht den Upload robust gegen Netzwerkfehler
- **✅ Meilenstein:** System ist produktionsreif (ohne AI)

---

### **Phase 5: AI Features** (Value-Add)

#### Story 04: Firestore onCreate Trigger

- **Kategorie:** Backend - Firebase Functions
- **Abhängigkeiten:** Story 03 (Failures müssen existieren)
- **Warum?** Startet die asynchrone AI-Analyse bei neuen Failures

#### Story 05: AI-Integration für Failure-Analyse

- **Kategorie:** Backend - Firebase Functions
- **Abhängigkeiten:** Story 04 (Trigger), Story 06 (Solution Interface)
- **Warum?** Implementiert die eigentliche AI-Analyse mit OpenAI/Gemini
- **✅ Meilenstein:** Komplettes Feature-Set verfügbar

---

### **Phase 6: Finalisierung** (Testing & Polish)

#### Story 13: End-to-End Upload-Flow Integration

- **Kategorie:** Integration & Testing
- **Abhängigkeiten:** Alle vorherigen Stories
- **Warum?** Formalisiert Tests für den gesamten Flow

#### Story 14: Error Handling und Logging

- **Kategorie:** Integration & Testing
- **Abhängigkeiten:** Alle vorherigen Stories
- **Warum?** Verbessert Debugging und Monitoring
- **Hinweis:** Kann iterativ während der gesamten Entwicklung verbessert werden
- **✅ Meilenstein:** Release Ready - Tests und Monitoring vorhanden

---

## 🎯 Wichtige Meilensteine

| Nach Story   | Meilenstein      | Was ist testbar?                           |
| ------------ | ---------------- | ------------------------------------------ |
| **Story 03** | Backend MVP      | Upload-Flow manuell testbar (curl/Postman) |
| **Story 10** | Client MVP       | Kompletter E2E Flow funktioniert           |
| **Story 12** | Production Ready | System ist robust und produktionsreif      |
| **Story 05** | Full Feature Set | AI-Analyse funktioniert                    |
| **Story 14** | Release Ready    | Tests und Monitoring vorhanden             |

---

## 🔄 Mögliche parallele Entwicklung

- **Story 09** (Reporter Config) kann parallel zu Stories 01-03 entwickelt werden
- **Story 11** (Datei-Sammler) kann parallel zu Stories 02-03 entwickelt werden
- **Story 14** (Error Handling) kann iterativ während der gesamten Entwicklung verbessert werden

---

## 💡 Empfehlung für MVP

Starte mit **Phase 1-3** (Stories 06, 07, 01, 02, 03, 09, 11, 10) für einen funktionierenden MVP:

- ✅ Testbarer Upload-Flow
- ✅ Frühe Integration zwischen Client und Server
- ✅ Schnelles Feedback zur Architektur
- ✅ Test-Run Tracking mit Metadaten

Danach kannst du entscheiden, ob du zuerst die Robustheit (Phase 4) oder die AI-Features (Phase 5) implementierst.

---

## 🔗 Test-Run Tracking (Querschnittsfunktion)

Die **Test-Run Tracking** Funktionalität ist in mehrere Stories integriert:

### Was ist ein Test-Run?

Ein Test-Run repräsentiert einen kompletten Durchlauf aller Tests (z.B. ein CI-Job). Jeder Run bekommt eine eindeutige `reportId` (UUID), die:

- Vom Reporter beim Start generiert wird
- Bei allen Failures dieses Runs gespeichert wird
- Run-Level Metadaten ermöglicht (Branch, Commit, CI-Job-ID)
- Statistiken pro Run erlaubt (z.B. "5 von 10 Tests failed")

### Vorteile

1. **Gruppierung**: Alle Failures eines Runs zusammen anzeigen
2. **Zeitliche Korrelation**: Welche Tests sind im gleichen CI-Run fehlgeschlagen?
3. **CI/CD Integration**: Branch, Commit-Hash, CI-Job-ID werden gespeichert
4. **Statistiken**: Erfolgsrate pro Run, Trends über Zeit
5. **Dashboard**: Übersicht aller Test-Runs mit Status

### Datenmodell

```typescript
interface TestRun {
  id: string; // reportId (UUID)
  tenantId: string;
  branch?: string;
  commit?: string;
  ciJobId?: string;
  totalTests: number;
  failedTests: number;
  passedTests: number;
  status: "running" | "completed" | "failed";
  startedAt: Timestamp;
  completedAt?: Timestamp;
}

interface Failure {
  // ...
  reportId: string; // Referenz zum TestRun
  // ...
}
```

### Betroffene Stories

- **Story 06**: TestRun Interface definieren
- **Story 03**: TestRun-Dokument erstellen/aktualisieren
- **Story 09**: reportId generieren, Metadaten sammeln
- **Story 10**: Run-Metadaten beim Upload senden

---

## 📚 Story-Kategorien (Original-Gruppierung)

### Backend - Firebase Functions (5 Stories)

- 01: API Key Validierungs-Middleware
- 02: getUploadUrls Function
- 03: submitFailure Function
- 04: Firestore onCreate Trigger
- 05: AI-Integration für Failure-Analyse

### Backend - Datenmodell & Utilities (3 Stories)

- 06: TypeScript Interfaces für Firestore Collections
- 07: API Key Generator und Hasher Utility
- 08: Tenant Quota Checker

### Client - Reporter Erweiterung (4 Stories)

- 09: Reporter-Konfiguration um Upload-Optionen erweitern
- 10: Uploader-Modul für signierte URLs
- 11: Datei-Sammler für Screenshots, Traces und Videos
- 12: Retry-Logik für Upload-Fehler

### Integration & Testing (2 Stories)

- 13: End-to-End Upload-Flow Integration
- 14: Error Handling und Logging
