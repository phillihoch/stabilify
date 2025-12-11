# Stabilify End-to-End Upload-Flow Testing Guide

Dieser Guide zeigt dir, wie du den kompletten Upload-Flow von Stabilify testest.

## Voraussetzungen

### 1. Firebase Functions deployen

Falls noch nicht geschehen, deploye die Firebase Functions:

```bash
cd /Users/philipphoch/Documents/git-projects/stabilify-server
npm run deploy
```

Dies deployed die Endpoints:

- `https://getuploadurls-euownvpvfa-ey.a.run.app` - Upload-URLs generieren
- `https://submitfailure-euownvpvfa-ey.a.run.app` - Failures speichern
- `https://createtestdata-euownvpvfa-ey.a.run.app` - Test-Daten generieren

### 2. Tenant und API Key generieren

Du hast drei Möglichkeiten, Test-Daten zu erstellen:

#### Option A: Über HTTP Request (empfohlen - am einfachsten!)

Rufe einfach die `createTestData` Function auf:

```bash
curl -X POST https://createtestdata-euownvpvfa-ey.a.run.app
```

Response:

```json
{
  "success": true,
  "tenant": {
    "id": "test-tenant-1234567890",
    "name": "Test Tenant",
    "plan": "free"
  },
  "apiKey": {
    "key": "sk_test_abc123...",
    "keyPrefix": "sk_test_abc123",
    "scopes": ["storage:write", "failures:write"],
    "environment": "test"
  },
  "warning": "⚠️  WICHTIG: Speichere den API Key sicher! Er wird nur einmal angezeigt."
}
```

**⚠️ Wichtig:** Speichere den `apiKey.key` Wert! Du brauchst ihn für die Reporter-Konfiguration.

#### Option B: Über Firebase Console (manuell)

1. Öffne die [Firebase Console](https://console.firebase.google.com/)
2. Wähle dein Projekt: `stabilify-dev`
3. Gehe zu **Firestore Database**

**Tenant erstellen:**

- Collection: `tenants`
- Document ID: z.B. `test-tenant-001`
- Felder:
  ```json
  {
    "name": "Test Tenant",
    "email": "test@example.com",
    "plan": "free",
    "failureQuota": 1000,
    "failureCount": 0,
    "isActive": true,
    "createdAt": [Timestamp: jetzt],
    "updatedAt": [Timestamp: jetzt]
  }
  ```

**API Key erstellen:**

- Collection: `apiKeys`
- Document ID: Auto-generiert
- Felder:
  ```json
  {
    "tenantId": "test-tenant-001",
    "keyPrefix": "sk_test_abc123",
    "keyHash": "[SHA-256 Hash des kompletten Keys]",
    "scopes": ["storage:write", "failures:write"],
    "environment": "test",
    "isActive": true,
    "expiresAt": null,
    "createdAt": [Timestamp: jetzt],
    "lastUsedAt": null,
    "usageCount": 0
  }
  ```

**Wichtig:** Du musst den API Key selbst generieren und hashen. Nutze dafür die Utility-Funktionen aus dem Server-Projekt.

#### Option C: Über Node.js Script

Erstelle ein Script im stabilify-server Projekt:

```bash
cd /Users/philipphoch/Documents/git-projects/stabilify-server
```

Erstelle `scripts/create-test-tenant.ts`:

```typescript
import { initializeApp } from "firebase-admin/app";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { generateApiKey, hashApiKey } from "../functions/src/utils/api-key";

initializeApp();
const db = getFirestore();

async function createTestTenant() {
  const tenantId = "test-tenant-001";

  // 1. Tenant erstellen
  await db.collection("tenants").doc(tenantId).set({
    name: "Test Tenant",
    email: "test@example.com",
    plan: "free",
    failureQuota: 1000,
    failureCount: 0,
    isActive: true,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  });

  console.log("✅ Tenant erstellt:", tenantId);

  // 2. API Key generieren
  const apiKey = generateApiKey("test");
  const keyPrefix = apiKey.substring(0, 15); // sk_test_abc123
  const keyHash = hashApiKey(apiKey);

  // 3. API Key in Firestore speichern
  await db.collection("apiKeys").add({
    tenantId,
    keyPrefix,
    keyHash,
    scopes: ["storage:write", "failures:write"],
    environment: "test",
    isActive: true,
    expiresAt: null,
    createdAt: Timestamp.now(),
    lastUsedAt: null,
    usageCount: 0,
  });

  console.log("✅ API Key erstellt");
  console.log("");
  console.log("🔑 WICHTIG: Speichere diesen API Key sicher!");
  console.log("API Key:", apiKey);
  console.log("");
  console.log("Dieser Key wird nur einmal angezeigt!");
}

createTestTenant().catch(console.error);
```

Führe das Script aus:

```bash
npx tsx scripts/create-test-tenant.ts
```

**Speichere den generierten API Key!** Du brauchst ihn für die Reporter-Konfiguration.

---

## Reporter konfigurieren

### 1. Playwright Config anpassen

Öffne deine `playwright.config.ts` und konfiguriere den Stabilify Reporter mit Upload-Optionen:

```typescript
import { defineConfig } from "@playwright/test";

export default defineConfig({
  reporter: [
    ["list"], // Standard Console Reporter
    [
      "./src/self-healing-reporter.ts",
      {
        outputFile: "stabilify-report.json",
        upload: {
          enabled: true,
          apiKey: "sk_test_DEIN_API_KEY_HIER", // ← Ersetze mit deinem API Key
        },
      },
    ],
  ],

  // Wichtig: Screenshots und Traces aktivieren
  use: {
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
    video: "retain-on-failure",
  },
});
```

**Hinweis:** Die Endpoints sind fest konfiguriert und müssen nicht angegeben werden.

### 2. Umgebungsvariable (Alternative)

Statt den API Key direkt in die Config zu schreiben, kannst du auch eine Umgebungsvariable nutzen:

```typescript
upload: {
  enabled: true,
  apiKey: process.env.STABILIFY_API_KEY || '',
  endpoint: 'https://europe-west3-stabilify-dev.cloudfunctions.net',
}
```

Dann setze die Variable:

```bash
export STABILIFY_API_KEY="sk_test_DEIN_API_KEY_HIER"
```

---

## Test-Projekt vorbereiten

### 1. Beispiel-Test mit absichtlichem Fehler erstellen

Erstelle eine Datei `tests/example-failure.spec.ts`:

```typescript
import { test, expect } from "@playwright/test";

test.describe("Stabilify Upload Test", () => {
  test("should fail and upload artifacts", async ({ page }) => {
    // Navigiere zu einer Seite
    await page.goto("https://playwright.dev");

    // Screenshot vor dem Fehler
    await page.screenshot({ path: "before-failure.png" });

    // Absichtlicher Fehler
    await expect(page.locator("h1")).toHaveText("This will fail");
  });

  test("another failing test", async ({ page }) => {
    await page.goto("https://example.com");

    // Noch ein absichtlicher Fehler
    await expect(page.locator("h1")).toContainText("Non-existent text");
  });
});
```

### 2. Reporter kompilieren

Da der Reporter in TypeScript geschrieben ist, musst du ihn kompilieren:

```bash
npm run build
```

---

## End-to-End Test durchführen

### 1. Tests ausführen

Führe die Tests aus (sie werden fehlschlagen, das ist gewollt):

```bash
npx playwright test tests/example-failure.spec.ts
```

### 2. Console-Output beobachten

Du solltest folgende Log-Ausgaben sehen:

```
[stabilify] Testsuite gestartet
[stabilify] Test fehlgeschlagen: should fail and upload artifacts
[stabilify] Testsuite beendet. 2 Fehler gesammelt.
[stabilify] Schreibe Report nach: stabilify-report.json
[stabilify] ✅ Report erfolgreich geschrieben
[stabilify] Starte Upload-Flow...
[stabilify] Starting complete upload flow for 2 failure(s)...
[stabilify] Collected 4 file(s) to upload
[stabilify] Requesting upload URLs for 4 file(s)...
[stabilify] ✓ Received 4 upload URL(s)
[stabilify] Received upload URLs for tenant: test-tenant-001 (expires: 2024-...)
[stabilify] Uploading 4 file(s)...
[stabilify] ✓ Uploaded: screenshot-1.png
[stabilify] ✓ Uploaded: trace-1.zip
[stabilify] ✓ Uploaded: screenshot-2.png
[stabilify] ✓ Uploaded: trace-2.zip
[stabilify] Upload complete: 4 successful, 0 failed
[stabilify] Successfully uploaded 4 file(s)
[stabilify] Submitting 2 failures for report abc-123-def...
[stabilify] ✓ Successfully submitted 2 failures
[stabilify] Linked 2 test(s) with uploaded files
[stabilify] ✅ Upload flow completed successfully for report abc-123-def
[stabilify] ✅ Upload erfolgreich: 2 Failures hochgeladen
[stabilify] Verknüpfte Dateien: 2 Test(s)
```

### 3. Daten in Firestore überprüfen

Öffne die [Firebase Console](https://console.firebase.google.com/) und prüfe:

**Collection: `failures`**

- Du solltest 2 neue Dokumente sehen
- Jedes Dokument sollte haben:
  - `tenantId`: "test-tenant-001"
  - `reportId`: Die UUID aus dem Log
  - `testId`: Die Test-ID
  - `title`: Der Test-Titel
  - `media.screenshots`: Array mit gs:// URLs
  - `media.traces`: Array mit gs:// URLs
  - `analysisStatus`: "pending"

**Collection: `tenants`**

- Dein Tenant sollte aktualisiert sein:
  - `failureCount`: 2 (oder höher, wenn du mehrmals getestet hast)
  - `updatedAt`: Aktueller Timestamp

**Collection: `apiKeys`**

- Dein API Key sollte aktualisiert sein:
  - `lastUsedAt`: Aktueller Timestamp
  - `usageCount`: Erhöht

### 4. Dateien in Cloud Storage überprüfen

Öffne die [Firebase Console](https://console.firebase.google.com/) → Storage:

**Bucket: `stabilify-failures`**

Du solltest folgende Struktur sehen:

```
stabilify-failures/
  └── test-tenant-001/
      ├── test-id-1/
      │   ├── screenshot-xxx.png
      │   └── trace-xxx.zip
      └── test-id-2/
          ├── screenshot-xxx.png
          └── trace-xxx.zip
```

---

## Fehlerbehandlung testen

### 1. Ungültiger API Key

Ändere den API Key in der Config zu einem ungültigen Wert:

```typescript
apiKey: "sk_test_invalid_key_123";
```

Erwartetes Verhalten:

```
[stabilify] Requesting upload URLs for 4 file(s)...
[stabilify] Failed to get upload URLs: Failed to fetch upload URLs (401): ...
[stabilify] ❌ Upload fehlgeschlagen: Error: Failed to fetch upload URLs
```

### 2. Upload deaktiviert

Setze `enabled: false`:

```typescript
upload: {
  enabled: false,
  apiKey: 'sk_test_...',
}
```

Erwartetes Verhalten:

- Kein Upload-Flow wird ausgeführt
- Nur lokaler Report wird geschrieben

### 3. Keine Failures

Führe Tests aus, die alle erfolgreich sind:

```typescript
test("passing test", async ({ page }) => {
  await page.goto("https://example.com");
  await expect(page.locator("h1")).toBeVisible();
});
```

Erwartetes Verhalten:

- Kein Upload-Flow wird ausgeführt (keine Failures)
- Report wird mit `totalFailures: 0` geschrieben

---

## Troubleshooting

### Problem: "Failed to fetch upload URLs (401)"

**Ursache:** API Key ist ungültig oder nicht in Firestore vorhanden

**Lösung:**

1. Prüfe, ob der API Key korrekt in der Config steht
2. Prüfe in Firestore, ob der API Key existiert
3. Prüfe, ob `keyHash` korrekt ist (SHA-256 Hash des kompletten Keys)
4. Prüfe, ob `isActive: true` gesetzt ist

### Problem: "Failed to fetch upload URLs (403)"

**Ursache:** API Key hat nicht die erforderlichen Scopes

**Lösung:**

1. Prüfe in Firestore, ob der API Key die Scopes `["storage:write", "failures:write"]` hat
2. Aktualisiere die Scopes falls nötig

### Problem: "Quota exceeded (429)"

**Ursache:** Tenant hat sein monatliches Limit erreicht

**Lösung:**

1. Erhöhe `failureQuota` in Firestore
2. Oder setze `failureCount` zurück auf 0 (nur für Tests!)

### Problem: "No files to upload"

**Ursache:** Playwright hat keine Screenshots/Traces erstellt

**Lösung:**

1. Prüfe `playwright.config.ts`:
   ```typescript
   use: {
     screenshot: 'only-on-failure',
     trace: 'retain-on-failure',
     video: 'retain-on-failure',
   }
   ```
2. Stelle sicher, dass Tests tatsächlich fehlschlagen

### Problem: "Module not found: StabilifyUploader"

**Ursache:** TypeScript wurde nicht kompiliert

**Lösung:**

```bash
npm run build
```

---

## Nächste Schritte

Nach erfolgreichem Test kannst du:

1. **Produktions-Setup erstellen:**

   - Erstelle einen Production-Tenant
   - Generiere einen `sk_live_...` API Key
   - Nutze Production-Endpoint

2. **CI/CD Integration:**

   - Setze `STABILIFY_API_KEY` als Secret in deiner CI
   - Aktiviere Upload nur in CI (nicht lokal)

3. **Monitoring einrichten:**

   - Überwache `failureCount` vs. `failureQuota`
   - Setze Alerts für Quota-Überschreitungen

4. **KI-Analyse implementieren:**
   - Nächster Meilenstein: Automatische Failure-Analyse
   - Solution-Generierung basierend auf Failures
