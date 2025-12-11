/**
 * TypeScript Interfaces für Firestore Collections
 *
 * Dieses Modul definiert typsichere Interfaces für alle Firestore Collections
 * gemäß dem Stabilify Server Architekturplan.
 *
 * Collections:
 * - tenants: Mandanten-Verwaltung für SaaS Multi-Tenancy
 * - testRuns: Test-Run Tracking für Gruppierung und Metadaten
 * - apiKeys: API Keys für Authentifizierung (gehashte Speicherung)
 * - failures: Fehlgeschlagene Tests mit Details und Medien
 * - solutions: AI-generierte Lösungsvorschläge
 *
 * @module types/firestore
 */

import type { Timestamp } from "firebase/firestore";
import type { ReportEnvironment } from "../self-healing-reporter";

// ============================================================================
// ENUMS
// ============================================================================

/**
 * Verfügbare Berechtigungen für API Keys.
 * Definiert die granularen Zugriffsrechte, die einem API Key zugewiesen werden können.
 */
export type ApiKeyScope =
  /** Berechtigung zum Hochladen von Failures */
  | "failures:write"
  /** Berechtigung zum Lesen von Failures */
  | "failures:read"
  /** Berechtigung zum Lesen von Solutions */
  | "solutions:read"
  /** Berechtigung zum Hochladen von Dateien (Screenshots, Traces, Videos) */
  | "storage:write";

/**
 * Status eines Test-Runs.
 * Beschreibt den aktuellen Zustand eines Test-Durchlaufs.
 */
export type TestRunStatus =
  /** Test-Run läuft noch */
  | "running"
  /** Test-Run erfolgreich abgeschlossen */
  | "completed"
  /** Test-Run fehlgeschlagen */
  | "failed"
  /** Test-Run abgebrochen */
  | "cancelled";

/**
 * Status eines Failures.
 * Beschreibt die Art des Testfehlers.
 */
export type FailureStatus =
  /** Test ist fehlgeschlagen */
  | "failed"
  /** Test wurde wegen Timeout abgebrochen */
  | "timedOut"
  /** Test wurde unterbrochen */
  | "interrupted";

/**
 * Analyse-Status eines Failures.
 * Beschreibt den Fortschritt der AI-Analyse.
 */
export type FailureAnalysisStatus =
  /** Wartet auf Analyse */
  | "pending"
  /** Wird gerade analysiert */
  | "analyzing"
  /** Analyse abgeschlossen */
  | "completed"
  /** Analyse fehlgeschlagen */
  | "failed";

/**
 * Kategorien für Fehlerursachen.
 * Klassifiziert die Art des Problems für bessere Lösungsvorschläge.
 */
export type SolutionCategory =
  /** Problem mit CSS/XPath Selektoren */
  | "selector"
  /** Timing-Problem (Race Condition, zu schnelle Interaktion) */
  | "timing"
  /** Datenabhängiges Problem (falscher Zustand, fehlende Testdaten) */
  | "data"
  /** Logik-Fehler im Test */
  | "logic"
  /** Infrastruktur-Problem (Netzwerk, Browser, etc.) */
  | "infrastructure";

/**
 * Typen von Lösungsstrategien.
 * Beschreibt die empfohlene Aktion zur Fehlerbehebung.
 */
export type SolutionStrategyType =
  /** Selektor muss aktualisiert werden */
  | "update_selector"
  /** Wait/Timeout hinzufügen */
  | "add_wait"
  /** Assertion korrigieren */
  | "fix_assertion"
  /** Manuelle Überprüfung erforderlich */
  | "manual_review";

/**
 * Unterstützte CI/CD Provider.
 */
export type CiProvider = "github" | "gitlab" | "jenkins" | "circleci" | "other";

/**
 * Verfügbare Tarif-Pläne.
 */
export type TenantPlan = "free" | "pro" | "enterprise";

/**
 * Unterstützte AI-Modelle für die Fehleranalyse.
 */
export type AiModel = "gpt-4o" | "gemini-1.5-pro";

// ============================================================================
// INTERFACES - Tenant
// ============================================================================

/**
 * Tenant-Einstellungen.
 * Konfigurierbare Optionen für einen Mandanten.
 */
export interface TenantSettings {
  /** Standard AI-Modell für Fehleranalyse */
  defaultAiModel: AiModel;
  /** Optional: Callback-URL für neue Solutions */
  webhookNotifyUrl?: string;
  /** Aufbewahrungsdauer für Failures in Tagen (default: 30) */
  retentionDays: number;
}

/**
 * Tenant (Mandant) - Collection: `tenants`
 *
 * Repräsentiert einen Kunden/Organisation in der SaaS-Anwendung.
 * Verwaltet Billing, Quota und Einstellungen.
 */
export interface Tenant {
  /** Eindeutige ID (Auto-generated, z.B. "tenant_abc123") */
  id: string;
  /** Firmenname des Mandanten */
  name: string;
  /** URL-freundlicher Name (unique, z.B. "acme-corp") */
  slug: string;

  // Billing
  /** Aktueller Tarif-Plan */
  plan: TenantPlan;
  /** Maximale Anzahl Failures pro Monat */
  failureQuota: number;
  /** Aktuelle Nutzung (wird monatlich zurückgesetzt) */
  failureCount: number;

  // Settings
  /** Mandanten-Einstellungen */
  settings: TenantSettings;

  // Metadata
  /** Erstellungszeitpunkt */
  createdAt: Timestamp;
  /** Letzter Aktualisierungszeitpunkt */
  updatedAt: Timestamp;
  /** Ist der Account aktiv? */
  active: boolean;
}

// ============================================================================
// INTERFACES - TestRun
// ============================================================================

/**
 * TestRun - Collection: `testRuns`
 *
 * Repräsentiert einen Test-Durchlauf (z.B. CI-Job) mit allen Metadaten.
 * Gruppiert mehrere Failures zu einem logischen Run.
 *
 * Die `id` entspricht der `reportId` (UUID), die vom Reporter generiert wird.
 */
export interface TestRun {
  /** reportId (UUID, vom Reporter generiert) */
  id: string;
  /** Referenz zum Tenant */
  tenantId: string;

  // CI/CD Context
  /** Git Branch (z.B. "main", "feature/xyz") */
  branch?: string;
  /** Git Commit Hash */
  commit?: string;
  /** CI Job ID (z.B. GitHub Actions Run ID) */
  ciJobId?: string;
  /** CI/CD Provider */
  ciProvider?: CiProvider;
  /** Link zum CI-Job */
  ciUrl?: string;

  // Statistiken
  /** Gesamtanzahl Tests */
  totalTests: number;
  /** Anzahl fehlgeschlagener Tests */
  failedTests: number;
  /** Anzahl erfolgreicher Tests */
  passedTests: number;
  /** Anzahl übersprungener Tests */
  skippedTests: number;

  // Timing
  /** Wann der Test-Run gestartet wurde */
  startedAt: Timestamp;
  /** Wann der Test-Run beendet wurde */
  completedAt?: Timestamp;
  /** Dauer in Millisekunden */
  duration?: number;

  // Status
  /** Aktueller Status des Test-Runs */
  status: TestRunStatus;

  // Environment
  /** Umgebungsinformationen (OS, Browser, etc.) */
  environment: ReportEnvironment;

  // Metadata
  /** Erstellungszeitpunkt */
  createdAt: Timestamp;
  /** Letzter Aktualisierungszeitpunkt */
  updatedAt: Timestamp;
}

// ============================================================================
// INTERFACES - ApiKey
// ============================================================================

/**
 * ApiKey - Collection: `apiKeys`
 *
 * Repräsentiert einen API-Schlüssel zur Authentifizierung.
 * Der echte Key wird NIEMALS gespeichert - nur ein SHA-256 Hash!
 *
 * API Key Format: sk_live_a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6
 * - "sk" = Secret Key Prefix
 * - "live/test" = Environment
 * - 32 Zeichen Random (Base62)
 */
export interface ApiKey {
  /** Eindeutige ID (Auto-generated) */
  id: string;
  /** Referenz zum Tenant */
  tenantId: string;

  // Sicherheit - NIEMALS den echten Key speichern!
  /** SHA-256 Hash des API Keys für Validierung */
  keyHash: string;
  /** Erste 8 Zeichen zur Identifikation (z.B. "sk_abc123...") */
  keyPrefix: string;

  // Beschreibung
  /** Beschreibender Name (z.B. "Production CI/CD", "Local Development") */
  name: string;
  /** Optionale ausführliche Beschreibung */
  description?: string;

  // Berechtigungen
  /** Zugewiesene Berechtigungen */
  scopes: ApiKeyScope[];

  // Tracking
  /** Letzter Verwendungszeitpunkt */
  lastUsedAt?: Timestamp;
  /** Anzahl der Verwendungen */
  usageCount: number;

  // Lifecycle
  /** Erstellungszeitpunkt */
  createdAt: Timestamp;
  /** Optionales Ablaufdatum */
  expiresAt?: Timestamp;
  /** Ist der Key aktiv? (kann deaktiviert werden) */
  active: boolean;
  /** Widerrufszeitpunkt (wenn widerrufen) */
  revokedAt?: Timestamp;
}

// ============================================================================
// INTERFACES - Failure (Sub-Interfaces)
// ============================================================================

/**
 * Position im Quellcode.
 */
export interface SourceLocation {
  /** Zeilennummer */
  line: number;
  /** Spaltennummer */
  column: number;
}

/**
 * Erweiterte Position mit Dateipfad.
 */
export interface FileLocation extends SourceLocation {
  /** Pfad zur Datei */
  file: string;
}

/**
 * Fehlerdetails eines einzelnen Fehlers.
 */
export interface FailureError {
  /** Fehlermeldung */
  message: string;
  /** Stack Trace */
  stack?: string;
  /** Code-Snippet um den Fehler */
  snippet?: string;
  /** Position des Fehlers im Quellcode */
  location?: FileLocation;
}

/**
 * Status eines Test-Schritts.
 */
export type FailureStepStatus = "passed" | "failed";

/**
 * Ein einzelner Test-Schritt mit Status.
 */
export interface FailureStep {
  /** Name/Titel des Schritts */
  name: string;
  /** Status des Schritts */
  status: FailureStepStatus;
  /** Dauer in Millisekunden */
  duration: number;
  /** Kategorie (z.B. 'test.step', 'hook', 'fixture') */
  category: string;
  /** Fehlermeldung wenn vorhanden */
  error?: string;
}

/**
 * Medien-URLs für einen Failure.
 * Pfade im Cloud Storage Format: gs://bucket/tenantId/testId/filename
 */
export interface FailureMedia {
  /** Pfade zu Screenshots */
  screenshots: string[];
  /** Pfade zu Trace-Dateien */
  traces: string[];
  /** Pfade zu Video-Dateien */
  videos: string[];
}

/**
 * Error-Context (Page Snapshot zum Fehlerzeitpunkt).
 */
export interface ErrorContext {
  /** Inhalt des Error-Context (z.B. Accessibility-Tree im YAML-Format) */
  content: string;
}

// ============================================================================
// INTERFACES - Failure
// ============================================================================

/**
 * Failure - Collection: `failures`
 *
 * Repräsentiert einen fehlgeschlagenen Test mit allen Details.
 * Enthält Referenzen zu Tenant und TestRun sowie verknüpfte Medien.
 */
export interface Failure {
  /** Eindeutige ID (Auto-generated) */
  id: string;
  /** Referenz zum Tenant (aus API Key ermittelt) */
  tenantId: string;
  /** Referenz zum TestRun (reportId UUID) */
  reportId: string;

  // Test-Identifikation
  /** Eindeutige Test-ID */
  testId: string;
  /** Vollständiger Titel-Pfad des Tests */
  title: string;
  /** Pfad zur Testdatei */
  file: string;
  /** Position im Quellcode */
  location: SourceLocation;
  /** Projektname */
  projectName: string;
  /** Suite-Pfad (hierarchischer Pfad) */
  suite: string;
  /** Browser-Information (Name + Version) */
  browser?: string;

  // Fehlerdetails
  /** Gesammelte Fehlerinformationen */
  errors: FailureError[];
  /** Ausgeführte Test-Schritte mit Status */
  steps: FailureStep[];

  // Storage URLs
  /** Medien-URLs (Screenshots, Traces, Videos) */
  media: FailureMedia;

  // Kontext
  /** Error-Context von Playwright (Page Snapshot zum Fehlerzeitpunkt) */
  errorContext?: ErrorContext;
  /** Standardausgabe des Tests */
  stdout: string[];
  /** Fehlerausgabe des Tests */
  stderr: string[];

  // Metadaten
  /** Status des Failures */
  status: FailureStatus;
  /** Testdauer in Millisekunden */
  duration: number;
  /** Retry-Nummer des aktuellen Versuchs */
  retry: number;
  /** Ist der Test flaky? (passed nach vorherigen Fehlern) */
  flaky: boolean;
  /** Umgebungsinformationen */
  environment: ReportEnvironment;

  // Lifecycle
  /** Erstellungszeitpunkt */
  createdAt: Timestamp;
  /** Status der AI-Analyse */
  analysisStatus: FailureAnalysisStatus;
  /** Referenz zur Solution (wenn Analyse abgeschlossen) */
  solutionId?: string;
}

// ============================================================================
// INTERFACES - Solution
// ============================================================================

/**
 * Lösungsstrategie für einen Failure.
 * Beschreibt die empfohlene Aktion zur Fehlerbehebung.
 */
export interface SolutionStrategy {
  /** Typ der Lösungsstrategie */
  type: SolutionStrategyType;
  /** Beschreibung der Lösung */
  description: string;
  /** Vorgeschlagener Code zur Fehlerbehebung */
  suggestedCode?: string;
  /** Betroffene Datei */
  affectedFile: string;
  /** Betroffene Zeile */
  affectedLine: number;
}

/**
 * Token-Nutzung der AI-Analyse.
 */
export interface TokenUsage {
  /** Anzahl der Input-Tokens */
  input: number;
  /** Anzahl der Output-Tokens */
  output: number;
}

/**
 * Solution - Collection: `solutions`
 *
 * Repräsentiert eine AI-generierte Lösung für einen Failure.
 * Enthält Analyse-Ergebnis, Lösungsstrategie und AI-Metadaten.
 */
export interface Solution {
  /** Eindeutige ID (Auto-generated) */
  id: string;
  /** Referenz zum Tenant */
  tenantId: string;
  /** Referenz zum Failure */
  failureId: string;

  // Analyse-Ergebnis
  /** Identifizierte Ursache des Fehlers */
  rootCause: string;
  /** Kategorie der Fehlerursache */
  category: SolutionCategory;
  /** Konfidenz der Analyse (0-1) */
  confidence: number;

  // Lösungsstrategie
  /** Empfohlene Lösung */
  strategy: SolutionStrategy;

  // AI Metadaten
  /** Verwendetes AI-Modell */
  model: string;
  /** Token-Nutzung */
  tokenUsage: TokenUsage;
  /** Verarbeitungszeit in Millisekunden */
  processingTimeMs: number;

  // Lifecycle
  /** Erstellungszeitpunkt */
  createdAt: Timestamp;
}
