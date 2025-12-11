# Stabilify Server Architektur Plan

## 1. Übersicht

Dieses Dokument beschreibt die geplante Server-Architektur für Stabilify als SaaS-Anwendung mit Multi-Tenancy-Support.

### 1.1 Kernkomponenten

- **Firebase Functions**: HTTP Webhook für Failure-Verarbeitung
- **Firestore**: Datenspeicherung (API Keys, Tenants, Failures, Solutions)
- **Cloud Storage**: Datei-Upload (Screenshots, Traces, Videos)
- **Reporter Client**: Direkter Upload + Webhook-Aufruf

---

## 2. Ablauf-Diagramm

```mermaid
sequenceDiagram
    participant Reporter as 📦 Reporter Client
    participant Functions as ⚡ Firebase Functions
    participant Storage as 🗄️ Cloud Storage
    participant Firestore as 📚 Firestore
    participant AI as 🤖 AI Analyse

    Note over Reporter: Test fehlgeschlagen

    rect rgb(240, 248, 255)
        Note over Reporter,Functions: Phase 1: Signierte Upload-URLs anfordern
        Reporter->>Reporter: Dateien sammeln (Screenshots, Traces)
        Reporter->>Functions: POST /getUploadUrls
        Note right of Functions: Header: x-api-key<br/>Body: { files: [...] }
        Functions->>Firestore: API Key validieren
        Firestore-->>Functions: ✅ Tenant gefunden
        Functions->>Storage: Signierte PUT-URLs generieren (15 Min gültig)
        Storage-->>Functions: Signierte URLs
        Functions-->>Reporter: { uploadUrls: [...], tenantId }
    end

    rect rgb(255, 250, 240)
        Note over Reporter,Storage: Phase 2: Dateien hochladen
        loop Für jede Datei
            Reporter->>Storage: PUT mit signierter URL
            Note right of Storage: Keine Rules-Prüfung nötig!<br/>URL ist bereits autorisiert
            Storage-->>Reporter: ✅ 200 OK
        end
    end

    rect rgb(255, 248, 240)
        Note over Reporter,Functions: Phase 3: Webhook Request
        Reporter->>Functions: POST /submitFailure
        Note right of Functions: Header: x-api-key<br/>Body: { reportId, failures[] }
        Functions->>Firestore: API Key validieren
        Firestore-->>Functions: ✅ Tenant gefunden
        Functions->>Storage: Hochgeladene Dateien suchen
        Functions->>Firestore: Failures speichern
        Functions-->>Reporter: 200 OK + Failure IDs
    end

    rect rgb(240, 255, 240)
        Note over Firestore,AI: Phase 4: Analyse (async)
        Firestore->>AI: onCreate Trigger
        AI->>AI: Fehler analysieren
        AI->>Firestore: Solution speichern
    end
```

---

## 3. Datenmodell

### 3.1 Collection: `tenants`

Mandanten-Verwaltung für SaaS Multi-Tenancy.

```mermaid
erDiagram
    TENANT {
        string id PK "Auto-generated"
        string name "Firmenname"
        string slug "URL-freundlicher Name"
        string plan "free | pro | enterprise"
        int failureQuota "Max Failures pro Monat"
        int failureCount "Aktuelle Nutzung"
        timestamp createdAt
        timestamp updatedAt
        boolean active "Account aktiv?"
    }
```

```typescript
interface Tenant {
  id: string; // Auto-generated (z.B. "tenant_abc123")
  name: string; // "ACME Corporation"
  slug: string; // "acme-corp" (unique, für URLs)

  // Billing
  plan: "free" | "pro" | "enterprise";
  failureQuota: number; // Max Failures pro Monat
  failureCount: number; // Aktuelle Nutzung (reset monatlich)

  // Settings
  settings: {
    defaultAiModel: "gpt-4o" | "gemini-1.5-pro";
    webhookNotifyUrl?: string; // Optional: Callback bei neuer Solution
    retentionDays: number; // Wie lange Failures behalten (default: 30)
  };

  // Metadata
  createdAt: Timestamp;
  updatedAt: Timestamp;
  active: boolean;
}
```

### 3.2 Collection: `testRuns`

Test-Run Tracking für Gruppierung und Metadaten.

```mermaid
erDiagram
    TEST_RUN {
        string id PK "reportId (UUID)"
        string tenantId FK "Referenz zu Tenant"
        string branch "Git Branch"
        string commit "Git Commit Hash"
        string ciJobId "CI Job ID"
        int totalTests "Anzahl Tests"
        int failedTests "Fehlgeschlagene Tests"
        int passedTests "Erfolgreiche Tests"
        timestamp startedAt
        timestamp completedAt
        string status "running | completed | failed"
    }

    TENANT ||--o{ TEST_RUN : "has many"
```

```typescript
interface TestRun {
  id: string; // reportId (UUID, vom Reporter generiert)
  tenantId: string; // Referenz zum Tenant

  // CI/CD Context
  branch?: string; // Git Branch (z.B. "main", "feature/xyz")
  commit?: string; // Git Commit Hash
  ciJobId?: string; // CI Job ID (z.B. GitHub Actions Run ID)
  ciProvider?: "github" | "gitlab" | "jenkins" | "circleci" | "other";
  ciUrl?: string; // Link zum CI-Job

  // Statistiken
  totalTests: number; // Gesamtanzahl Tests
  failedTests: number; // Anzahl fehlgeschlagener Tests
  passedTests: number; // Anzahl erfolgreicher Tests
  skippedTests: number; // Anzahl übersprungener Tests

  // Timing
  startedAt: Timestamp; // Wann der Test-Run gestartet wurde
  completedAt?: Timestamp; // Wann der Test-Run beendet wurde
  duration?: number; // Dauer in Millisekunden

  // Status
  status: "running" | "completed" | "failed" | "cancelled";

  // Environment
  environment: ReportEnvironment; // OS, Browser, etc.

  // Metadata
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

### 3.3 Collection: `apiKeys`

API Keys für Authentifizierung - **gehashte Speicherung**.

```mermaid
erDiagram
    API_KEY {
        string id PK "Auto-generated"
        string tenantId FK "Referenz zu Tenant"
        string keyHash "SHA-256 Hash des Keys"
        string keyPrefix "Erste 8 Zeichen (sk_abc123...)"
        string name "Beschreibender Name"
        string[] scopes "Berechtigungen"
        timestamp lastUsedAt
        timestamp expiresAt
        boolean active
    }

    TENANT ||--o{ API_KEY : "has many"
```

```typescript
interface ApiKey {
  id: string; // Auto-generated
  tenantId: string; // Referenz zum Tenant

  // Sicherheit - NIEMALS den echten Key speichern!
  keyHash: string; // SHA-256 Hash des API Keys
  keyPrefix: string; // "sk_abc123..." (erste 8 Zeichen zur Identifikation)

  // Beschreibung
  name: string; // "Production CI/CD", "Local Development"
  description?: string;

  // Berechtigungen
  scopes: ApiKeyScope[]; // ['failures:write', 'solutions:read']

  // Tracking
  lastUsedAt?: Timestamp;
  usageCount: number;

  // Lifecycle
  createdAt: Timestamp;
  expiresAt?: Timestamp; // Optional: Ablaufdatum
  active: boolean; // Kann deaktiviert werden
  revokedAt?: Timestamp;
}

type ApiKeyScope =
  | "failures:write" // Failures hochladen
  | "failures:read" // Failures lesen
  | "solutions:read" // Solutions lesen
  | "storage:write"; // Dateien hochladen
```

**API Key Format:**

```
sk_live_a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6
│  │    │
│  │    └── 32 Zeichen Random (Base62)
│  └─────── Environment (live/test)
└────────── Prefix "sk" = Secret Key
```

### 3.4 Collection: `failures`

```mermaid
erDiagram
    FAILURE {
        string id PK "Auto-generated"
        string tenantId FK "Referenz zu Tenant"
        string reportId FK "Referenz zu TestRun"
        string testId "Test-ID"
        string title "Test-Titel"
        string status "failed | timedOut | interrupted"
        timestamp createdAt
    }

    TEST_RUN ||--o{ FAILURE : "has many"
    TENANT ||--o{ FAILURE : "has many"
```

```typescript
interface Failure {
  id: string; // Auto-generated
  tenantId: string; // Aus API Key ermittelt
  reportId: string; // Referenz zum TestRun (UUID)

  // Original CollectedFailure Daten
  testId: string;
  title: string;
  file: string;
  location: { line: number; column: number };
  projectName: string;
  suite: string;
  browser?: string;

  errors: Array<{
    message: string;
    stack?: string;
    snippet?: string;
    location?: { file: string; line: number; column: number };
  }>;

  steps: FailureStep[];

  // Storage URLs (generiert aus testId)
  media: {
    screenshots: string[]; // gs://bucket/tenantId/testId/screenshot-*.png
    traces: string[];
    videos: string[];
  };

  errorContext?: { content: string };
  stdout: string[];
  stderr: string[];

  // Metadaten
  status: "failed" | "timedOut" | "interrupted";
  duration: number;
  retry: number;
  flaky: boolean;
  environment: ReportEnvironment;

  // Lifecycle
  createdAt: Timestamp;
  analysisStatus: "pending" | "analyzing" | "completed" | "failed";
  solutionId?: string; // Referenz zur Solution
}
```

### 3.5 Collection: `solutions`

```typescript
interface Solution {
  id: string;
  tenantId: string;
  failureId: string;

  // Analyse-Ergebnis
  rootCause: string;
  category: "selector" | "timing" | "data" | "logic" | "infrastructure";
  confidence: number; // 0-1

  // Lösungsstrategie
  strategy: {
    type: "update_selector" | "add_wait" | "fix_assertion" | "manual_review";
    description: string;
    suggestedCode?: string;
    affectedFile: string;
    affectedLine: number;
  };

  // AI Metadaten
  model: string;
  tokenUsage: { input: number; output: number };
  processingTimeMs: number;

  createdAt: Timestamp;
}
```

---

## 4. Cloud Storage Struktur

### 4.1 Bucket-Struktur

```mermaid
graph TD
    subgraph "Cloud Storage: stabilify-failures"
        ROOT["/"] --> T1["/{tenantId}/"]
        T1 --> TEST1["/{testId}/"]
        TEST1 --> SS["screenshot-1.png"]
        TEST1 --> SS2["screenshot-2.png"]
        TEST1 --> TR["trace.zip"]
        TEST1 --> VD["video.webm"]

        T1 --> TEST2["/{testId-2}/"]
        TEST2 --> SS3["screenshot-1.png"]
    end
```

**Pfad-Konvention:**

```
gs://stabilify-failures/{tenantId}/{testId}/{filename}
```

### 4.2 Storage Security Rules (Vereinfacht)

Da wir **signierte URLs** verwenden, brauchen wir keine komplexen Storage Rules. Die Autorisierung erfolgt vollständig über die Firebase Function, die die URLs generiert.

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /{allPaths=**} {
      // Alle direkten Zugriffe blockieren
      // Uploads erfolgen NUR über signierte URLs (umgehen Rules)
      // Lesen erfolgt über signierte URLs oder Admin SDK
      allow read, write: if false;
    }
  }
}
```

> ✅ **Vorteil**: Keine Firestore-Lookups in Storage Rules = bessere Performance und niedrigere Kosten.

### 4.3 Wie signierte URLs funktionieren

```mermaid
flowchart LR
    subgraph "1. URL anfordern"
        A[Client] -->|"POST /getUploadUrls<br/>x-api-key: sk_..."| B[Firebase Function]
        B -->|"Validiert Key"| C[(Firestore)]
        B -->|"Generiert URLs"| D[Cloud Storage]
    end

    subgraph "2. Direkt hochladen"
        A2[Client] -->|"PUT mit signierter URL"| D2[Cloud Storage]
        Note1[Keine Rules-Prüfung!<br/>URL ist bereits autorisiert]
    end
```

**Eigenschaften signierter URLs:**

- Zeitlich begrenzt (z.B. 15 Minuten)
- Nur für spezifische Aktion (PUT/GET)
- Nur für spezifischen Pfad
- Enthält kryptografische Signatur
- **Metadaten werden serverseitig vordefiniert** (Client kann sie nicht manipulieren)

### 4.4 Serverseitig vordefinierte Metadaten

> 🔒 **Sicherheitsvorteil**: Die Metadaten werden beim Generieren der signierten URL vom Server festgelegt. Der Client kann diese nicht ändern oder fälschen.

| Metadaten-Feld            | Wert                   | Quelle                |
| ------------------------- | ---------------------- | --------------------- |
| `x-goog-meta-tenant-id`   | Tenant ID              | Aus API Key ermittelt |
| `x-goog-meta-test-id`     | Test ID                | Aus Request Body      |
| `x-goog-meta-file-type`   | screenshot/trace/video | Aus Request Body      |
| `x-goog-meta-uploaded-at` | ISO Timestamp          | Server-Zeit           |

**Wichtig:**

- ❌ **Kein API Key** (weder echt noch gehasht) in den Metadaten
- ✅ Der echte API Key wird nur verschlüsselt (HTTPS) an die Function gesendet
- ✅ Die Autorisierung ist in der signierten URL eingebettet

---

## 5. API Key Validierung

### 5.1 Hashing-Strategie

```mermaid
flowchart LR
    subgraph Client
        A[API Key<br/>sk_live_abc123...] --> B[SHA-256]
        B --> C[Hash<br/>9f86d08...64]
    end

    subgraph Firestore
        D[(apiKeys Collection)]
        D --> E["Document ID = Hash"]
    end

    C --> |"Lookup by ID"| D
```

**Warum SHA-256?**

- Einweg-Hash (nicht umkehrbar)
- Schnell zu berechnen
- Deterministisch (gleicher Input = gleicher Output)
- Document ID = Hash ermöglicht O(1) Lookup

### 5.2 API Key Lifecycle

```mermaid
stateDiagram-v2
    [*] --> Created: Admin erstellt Key
    Created --> Active: Key aktiviert
    Active --> Active: Nutzung
    Active --> Expired: Ablaufdatum erreicht
    Active --> Revoked: Manuell widerrufen
    Expired --> [*]
    Revoked --> [*]

    note right of Active
        lastUsedAt wird aktualisiert
        usageCount wird erhöht
    end note
```

---

## 6. Firebase Functions

### 6.1 Function: `getUploadUrls`

Generiert signierte Upload-URLs für Dateien.

#### Request/Response Schema

```typescript
// POST /getUploadUrls
// Header: x-api-key: sk_live_abc123...

interface GetUploadUrlsRequest {
  files: Array<{
    testId: string; // Test-ID zur Zuordnung
    fileName: string; // z.B. "screenshot-1.png"
    contentType: string; // z.B. "image/png"
    fileType: "screenshot" | "trace" | "video";
  }>;
}

interface GetUploadUrlsResponse {
  success: boolean;
  tenantId: string; // Für Client-Referenz
  uploadUrls: Array<{
    testId: string;
    fileName: string;
    uploadUrl: string; // Signierte PUT-URL (15 Min gültig)
    destination: string; // gs://bucket/path
  }>;
  expiresAt: string; // ISO Timestamp
}
```

#### Pseudo-Code

```typescript
import * as functions from "firebase-functions";
import * as crypto from "crypto";
import { getFirestore } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";

export const getUploadUrls = functions.https.onRequest(async (req, res) => {
  // 1. API Key validieren
  const apiKey = req.headers["x-api-key"] as string;
  if (!apiKey) {
    return res.status(401).json({ error: "API Key required" });
  }

  const keyHash = crypto.createHash("sha256").update(apiKey).digest("hex");
  const db = getFirestore();
  const apiKeyDoc = await db.collection("apiKeys").doc(keyHash).get();

  if (!apiKeyDoc.exists) {
    return res.status(403).json({ error: "Invalid API Key" });
  }

  const apiKeyData = apiKeyDoc.data()!;

  // 2. Key-Status prüfen
  if (!apiKeyData.active) {
    return res.status(403).json({ error: "API Key is inactive" });
  }

  // 3. Scope prüfen
  if (!apiKeyData.scopes.includes("storage:write")) {
    return res.status(403).json({ error: "Missing scope: storage:write" });
  }

  // 4. Signierte URLs generieren
  const { files } = req.body as GetUploadUrlsRequest;
  const bucket = getStorage().bucket("stabilify-failures");
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 Minuten

  const uploadUrls = await Promise.all(
    files.map(async (file) => {
      const filePath = `${apiKeyData.tenantId}/${file.testId}/${file.fileName}`;
      const storageFile = bucket.file(filePath);

      // Metadaten serverseitig vordefinieren (Client kann diese nicht ändern!)
      const [signedUrl] = await storageFile.getSignedUrl({
        version: "v4",
        action: "write",
        expires: expiresAt,
        contentType: file.contentType,
        extensionHeaders: {
          "x-goog-meta-tenant-id": apiKeyData.tenantId,
          "x-goog-meta-test-id": file.testId,
          "x-goog-meta-file-type": file.fileType,
          "x-goog-meta-uploaded-at": new Date().toISOString(),
        },
      });

      return {
        testId: file.testId,
        fileName: file.fileName,
        uploadUrl: signedUrl,
        destination: `gs://stabilify-failures/${filePath}`,
      };
    })
  );

  return res.status(200).json({
    success: true,
    tenantId: apiKeyData.tenantId,
    uploadUrls,
    expiresAt: expiresAt.toISOString(),
  });
});
```

---

### 6.2 Function: `submitFailure`

Speichert Failure-Daten in Firestore und verknüpft hochgeladene Dateien.

#### Request/Response Schema

```typescript
// POST /submitFailure
// Header: x-api-key: sk_live_abc123...

interface SubmitFailureRequest {
  reportId: string; // Eindeutige ID für diesen Test-Run
  failures: CollectedFailure[]; // Array von Failures
}

interface SubmitFailureResponse {
  success: boolean;
  reportId: string;
  failureIds: string[]; // Generierte Firestore Doc IDs
  linkedFiles: {
    testId: string;
    files: string[]; // Gefundene Dateien im Storage
  }[];
}
```

### 6.2 Function Ablauf

```mermaid
flowchart TD
    A[Request empfangen] --> B{API Key Header<br/>vorhanden?}
    B -->|Nein| C[401 Unauthorized]
    B -->|Ja| D[API Key hashen]
    D --> E{Hash in Firestore<br/>gefunden?}
    E -->|Nein| F[403 Forbidden]
    E -->|Ja| G{Key aktiv &<br/>nicht abgelaufen?}
    G -->|Nein| H[403 Key Inactive]
    G -->|Ja| I[Tenant laden]
    I --> J{Quota<br/>überschritten?}
    J -->|Ja| K[429 Rate Limit]
    J -->|Nein| L[Für jeden Failure:]

    L --> M[Storage Dateien suchen<br/>nach testId]
    M --> N[Failure in Firestore<br/>speichern]
    N --> O[Tenant failureCount<br/>erhöhen]
    O --> P[200 OK + IDs]

    style C fill:#ffcccc
    style F fill:#ffcccc
    style H fill:#ffcccc
    style K fill:#ffffcc
    style P fill:#ccffcc
```

### 6.3 Pseudo-Code

```typescript
import * as functions from "firebase-functions";
import * as crypto from "crypto";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";

export const submitFailure = functions.https.onRequest(async (req, res) => {
  // 1. API Key extrahieren
  const apiKey = req.headers["x-api-key"] as string;
  if (!apiKey) {
    return res.status(401).json({ error: "API Key required" });
  }

  // 2. API Key hashen
  const keyHash = crypto.createHash("sha256").update(apiKey).digest("hex");

  // 3. API Key in Firestore validieren
  const db = getFirestore();
  const apiKeyDoc = await db.collection("apiKeys").doc(keyHash).get();

  if (!apiKeyDoc.exists) {
    return res.status(403).json({ error: "Invalid API Key" });
  }

  const apiKeyData = apiKeyDoc.data()!;

  // 4. Key-Status prüfen
  if (!apiKeyData.active) {
    return res.status(403).json({ error: "API Key is inactive" });
  }

  if (apiKeyData.expiresAt && apiKeyData.expiresAt.toDate() < new Date()) {
    return res.status(403).json({ error: "API Key expired" });
  }

  // 5. Tenant laden
  const tenantDoc = await db
    .collection("tenants")
    .doc(apiKeyData.tenantId)
    .get();
  const tenant = tenantDoc.data()!;

  // 6. Quota prüfen
  if (tenant.failureCount >= tenant.failureQuota) {
    return res.status(429).json({ error: "Monthly quota exceeded" });
  }

  // 7. Failures verarbeiten
  const { reportId, failures } = req.body as SubmitFailureRequest;
  const storage = getStorage().bucket("stabilify-failures");
  const failureIds: string[] = [];

  for (const failure of failures) {
    // Storage-Dateien für diese testId finden
    const [files] = await storage.getFiles({
      prefix: `${apiKeyData.tenantId}/${failure.testId}/`,
    });

    const mediaUrls = {
      screenshots: files
        .filter((f) => f.name.includes("screenshot"))
        .map((f) => f.publicUrl()),
      traces: files
        .filter((f) => f.name.includes("trace"))
        .map((f) => f.publicUrl()),
      videos: files
        .filter((f) => f.name.includes("video"))
        .map((f) => f.publicUrl()),
    };

    // In Firestore speichern
    const docRef = await db.collection("failures").add({
      ...failure,
      tenantId: apiKeyData.tenantId,
      reportId,
      media: mediaUrls,
      createdAt: Timestamp.now(),
      analysisStatus: "pending",
    });

    failureIds.push(docRef.id);
  }

  // 8. Usage aktualisieren
  await db
    .collection("apiKeys")
    .doc(keyHash)
    .update({
      lastUsedAt: Timestamp.now(),
      usageCount: apiKeyData.usageCount + 1,
    });

  await db
    .collection("tenants")
    .doc(apiKeyData.tenantId)
    .update({
      failureCount: tenant.failureCount + failures.length,
    });

  return res.status(200).json({
    success: true,
    reportId,
    failureIds,
  });
});
```

---

## 7. Client-Implementierung (Reporter)

### 7.1 Upload-Ablauf im Reporter

```mermaid
flowchart TD
    A[onEnd Hook] --> B[Failures sammeln]
    B --> C{Failures<br/>vorhanden?}
    C -->|Nein| D[Ende]
    C -->|Ja| E[Datei-Liste erstellen]

    subgraph "Phase 1: Signierte URLs holen"
        E --> F[POST /getUploadUrls]
        F --> G{Erfolgreich?}
        G -->|Nein| H[Fehler loggen]
        G -->|Ja| I[URLs + TenantId erhalten]
    end

    subgraph "Phase 2: Dateien hochladen"
        I --> J[Für jede URL:]
        J --> K[PUT mit signierter URL]
        K --> L{Upload OK?}
        L -->|Nein| M[Retry]
        L -->|Ja| N[Nächste Datei]
        M --> K
    end

    subgraph "Phase 3: Webhook"
        N --> O[POST /submitFailure]
        O --> P{Erfolgreich?}
        P -->|Ja| Q[Failure IDs loggen]
        P -->|Nein| R[Retry mit Backoff]
        R --> O
    end

    Q --> D
    H --> D
```

### 7.2 Reporter Erweiterung

```typescript
// Neue Reporter-Optionen
interface SelfHealingReporterOptions {
  // Bestehende Optionen...
  outputFile?: string;
  environment?: ReportEnvironment;

  // NEU: Server-Upload
  upload?: {
    enabled: boolean;
    apiKey: string; // sk_live_xxx oder ENV Variable
    endpoint?: string; // Default: https://api.stabilify.dev
    retryAttempts?: number; // Default: 3
    retryDelayMs?: number; // Default: 1000
  };
}

// Beispiel-Konfiguration
// playwright.config.ts
export default defineConfig({
  reporter: [
    [
      "stabilify/reporter",
      {
        upload: {
          enabled: true,
          apiKey: process.env.STABILIFY_API_KEY,
        },
      },
    ],
  ],
});
```

> 📝 **Hinweis**: `tenantId` wird nicht mehr benötigt - der Server ermittelt es automatisch aus dem API Key.

### 7.3 Uploader mit signierten URLs

```typescript
import * as fs from "fs";
import * as path from "path";

interface UploadOptions {
  apiKey: string;
  endpoint: string;
}

interface FileToUpload {
  testId: string;
  localPath: string;
  fileName: string;
  contentType: string;
  fileType: "screenshot" | "trace" | "video";
}

class StabilifyUploader {
  private apiKey: string;
  private endpoint: string;

  constructor(options: UploadOptions) {
    this.apiKey = options.apiKey;
    this.endpoint = options.endpoint || "https://api.stabilify.dev";
  }

  /**
   * Sammelt alle hochzuladenden Dateien aus den Failures
   */
  collectFilesToUpload(failures: CollectedFailure[]): FileToUpload[] {
    const files: FileToUpload[] = [];

    for (const failure of failures) {
      // Screenshots
      for (const screenshotPath of failure.screenshots) {
        if (fs.existsSync(screenshotPath)) {
          files.push({
            testId: failure.testId,
            localPath: screenshotPath,
            fileName: path.basename(screenshotPath),
            contentType: "image/png",
            fileType: "screenshot",
          });
        }
      }

      // Traces
      for (const tracePath of failure.traces) {
        if (fs.existsSync(tracePath)) {
          files.push({
            testId: failure.testId,
            localPath: tracePath,
            fileName: path.basename(tracePath),
            contentType: "application/zip",
            fileType: "trace",
          });
        }
      }

      // Videos
      for (const videoPath of failure.videos) {
        if (fs.existsSync(videoPath)) {
          files.push({
            testId: failure.testId,
            localPath: videoPath,
            fileName: path.basename(videoPath),
            contentType: "video/webm",
            fileType: "video",
          });
        }
      }
    }

    return files;
  }

  /**
   * Schritt 1: Signierte URLs vom Server holen
   */
  async getUploadUrls(files: FileToUpload[]): Promise<GetUploadUrlsResponse> {
    const response = await fetch(`${this.endpoint}/getUploadUrls`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": this.apiKey,
      },
      body: JSON.stringify({
        files: files.map((f) => ({
          testId: f.testId,
          fileName: f.fileName,
          contentType: f.contentType,
          fileType: f.fileType,
        })),
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to get upload URLs: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Schritt 2: Dateien mit signierten URLs hochladen
   */
  async uploadFiles(
    files: FileToUpload[],
    uploadUrls: GetUploadUrlsResponse["uploadUrls"]
  ): Promise<void> {
    const uploads = files.map(async (file) => {
      const urlInfo = uploadUrls.find(
        (u) => u.testId === file.testId && u.fileName === file.fileName
      );

      if (!urlInfo) {
        console.warn(`No upload URL for ${file.fileName}`);
        return;
      }

      const fileContent = fs.readFileSync(file.localPath);

      const response = await fetch(urlInfo.uploadUrl, {
        method: "PUT",
        headers: {
          "Content-Type": file.contentType,
        },
        body: fileContent,
      });

      if (!response.ok) {
        throw new Error(
          `Upload failed for ${file.fileName}: ${response.statusText}`
        );
      }
    });

    await Promise.all(uploads);
  }

  /**
   * Schritt 3: Failures an Webhook senden
   */
  async submitFailures(
    reportId: string,
    failures: CollectedFailure[]
  ): Promise<SubmitFailureResponse> {
    const response = await fetch(`${this.endpoint}/submitFailure`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": this.apiKey,
      },
      body: JSON.stringify({ reportId, failures }),
    });

    if (!response.ok) {
      throw new Error(`Failed to submit failures: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Kompletter Upload-Flow
   */
  async uploadAll(
    reportId: string,
    failures: CollectedFailure[]
  ): Promise<void> {
    // 1. Dateien sammeln
    const files = this.collectFilesToUpload(failures);
    console.log(`[stabilify] ${files.length} Dateien zum Upload gefunden`);

    if (files.length > 0) {
      // 2. Signierte URLs holen
      const { uploadUrls, tenantId } = await this.getUploadUrls(files);
      console.log(`[stabilify] Upload-URLs erhalten für Tenant: ${tenantId}`);

      // 3. Dateien hochladen
      await this.uploadFiles(files, uploadUrls);
      console.log(`[stabilify] ${files.length} Dateien hochgeladen`);
    }

    // 4. Failures an Webhook senden
    const result = await this.submitFailures(reportId, failures);
    console.log(`[stabilify] ${result.failureIds.length} Failures gespeichert`);
  }
}
```

---

## 8. Gesamtarchitektur

```mermaid
graph TB
    subgraph "Client Environment"
        PW[Playwright Tests] --> REP[Stabilify Reporter]
        REP --> UP[Uploader Module]
    end

    subgraph "Firebase Cloud"
        subgraph "Cloud Storage"
            BUCKET[(stabilify-failures<br/>Bucket)]
        end

        subgraph "Cloud Functions"
            GU[getUploadUrls<br/>HTTP Trigger]
            SF[submitFailure<br/>HTTP Trigger]
            AF[analyzeFailure<br/>Firestore Trigger]
        end

        subgraph "Firestore"
            TEN[(tenants)]
            API[(apiKeys)]
            FAIL[(failures)]
            SOL[(solutions)]
        end

        subgraph "External"
            AI[OpenAI / Gemini]
        end
    end

    subgraph "Future: Dashboard"
        DASH[Web Dashboard]
    end

    UP -->|"1. POST /getUploadUrls"| GU
    GU -->|"Validate"| API
    GU -->|"Generate Signed URLs"| BUCKET
    GU -->|"Return URLs"| UP
    UP -->|"2. PUT mit Signed URL"| BUCKET
    UP -->|"3. POST /submitFailure"| SF
    SF -->|"Validate"| API
    SF -->|"Check Tenant"| TEN
    SF -->|"Create"| FAIL
    FAIL -->|"onCreate"| AF
    AF -->|"Analyze"| AI
    AI -->|"Response"| AF
    AF -->|"Create"| SOL

    DASH -->|"Read"| FAIL
    DASH -->|"Read"| SOL
    DASH -->|"View"| BUCKET
```

---

## 9. Implementierungs-Roadmap

### Phase 1: Foundation (2-3 Tage)

- [ ] Firebase Projekt erstellen
- [ ] Firestore Collections anlegen (tenants, apiKeys)
- [ ] Storage Bucket + Rules konfigurieren
- [ ] Ersten API Key manuell erstellen

### Phase 2: Server (2-3 Tage)

- [ ] `getUploadUrls` Function implementieren
- [ ] `submitFailure` Function implementieren
- [ ] API Key Validierung (shared Helper)
- [ ] Failure-Speicherung
- [ ] Error Handling & Logging

### Phase 3: Client (2 Tage)

- [ ] Reporter um Upload-Optionen erweitern
- [ ] `getUploadUrls` Call implementieren
- [ ] Upload mit signierten URLs
- [ ] Webhook-Aufruf implementieren
- [ ] Retry-Logik

### Phase 4: Analyse (3-4 Tage)

- [ ] `analyzeFailure` Trigger implementieren
- [ ] OpenAI/Gemini Integration
- [ ] Prompt Engineering
- [ ] Solution-Speicherung

### Phase 5: Dashboard (Future)

- [ ] Next.js/React Dashboard
- [ ] Firebase Auth Integration
- [ ] Failure-Übersicht
- [ ] Solution-Anzeige

---

## 10. Offene Fragen

| Frage                         | Optionen                                 | Entscheidung                                |
| ----------------------------- | ---------------------------------------- | ------------------------------------------- |
| Storage Upload-Methode?       | a) Storage Rules<br/>b) Signed URLs      | ✅ **b) Signed URLs** (bessere Performance) |
| AI Provider?                  | a) OpenAI<br/>b) Gemini<br/>c) Beide     | c) Konfigurierbar pro Tenant                |
| Rate Limiting Implementation? | a) In Function<br/>b) Firebase App Check | a) Für MVP ausreichend                      |
| URL Gültigkeitsdauer?         | 5 Min / 15 Min / 30 Min                  | 15 Minuten (guter Kompromiss)               |

---

## 11. Zusammenfassung

Dieser Plan beschreibt eine vollständige SaaS-Architektur für Stabilify mit:

✅ **Multi-Tenancy** durch Tenant-Collection und API Key Mapping
✅ **Sichere API Keys** durch SHA-256 Hashing und Firestore-Lookup
✅ **Signierte Upload-URLs** für performanten und sicheren File-Upload
✅ **Asynchrone Analyse** durch Firestore Trigger
✅ **Skalierbar** durch serverlose Firebase-Architektur
✅ **Zukunftssicher** mit Dashboard-Ready Datenmodell

### Vorteile der Signed URL Architektur

| Aspekt          | Vorteil                                                |
| --------------- | ------------------------------------------------------ |
| **Performance** | 1 Firestore-Read für alle URLs (statt pro Datei)       |
| **Kosten**      | Weniger Firestore-Reads = niedrigere Kosten            |
| **Sicherheit**  | Zeitlich begrenzte URLs, keine dauerhaften Credentials |
| **Einfachheit** | Keine komplexen Storage Rules nötig                    |
