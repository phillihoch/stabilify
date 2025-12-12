/**
 * TypeScript Interfaces für Firestore Collections
 *
 * Dieses Modul definiert typsichere Interfaces für alle Firestore Collections
 * gemäß dem Stabilify Server Architekturplan.
 *
 * Collections:
 * - tenants: Mandanten-Verwaltung für SaaS Multi-Tenancy
 * - apiKeys: API Keys für Authentifizierung (gehashte Speicherung)
 * - testRuns: Vollständige Test-Reports (CTRF + Stabilify Extensions)
 * - solutions: AI-generierte Lösungsvorschläge
 *
 * @module types/firestore
 */

import type { Timestamp } from "firebase/firestore";
import type { AiModel, TenantPlan } from "./shared";
import type { StabilifyTestReport } from "./stabilify-report";

// Re-Export für Bequemlichkeit
export type { AiModel, CiProvider, TenantPlan } from "./shared";

// ============================================================================
// ENUMS
// ============================================================================

/**
 * Verfügbare Berechtigungen für API Keys.
 * Definiert die granularen Zugriffsrechte, die einem API Key zugewiesen werden können.
 */
export type ApiKeyScope =
  /** Berechtigung zum Hochladen von Test-Runs */
  | "test_runs:write"
  /** Berechtigung zum Lesen von Test-Runs */
  | "test_runs:read"
  /** Berechtigung zum Lesen von Solutions */
  | "solutions:read"
  /** Berechtigung zum Hochladen von Dateien (Screenshots, Traces, Videos) */
  | "storage:write";

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
  /** Aufbewahrungsdauer für Test-Runs in Tagen (default: 30) */
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
// INTERFACES - TestRun
// ============================================================================

/**
 * Analyse-Status eines Test-Runs.
 * Beschreibt den Fortschritt der AI-Analyse für enthaltene Failures.
 */
export type AnalysisStatus =
  /** Wartet auf Analyse */
  | "pending"
  /** Wird gerade analysiert */
  | "analyzing"
  /** Analyse abgeschlossen */
  | "completed"
  /** Analyse fehlgeschlagen */
  | "failed"
  /** Keine Analyse erforderlich (keine Failures) */
  | "skipped";

/**
 * TestRun - Collection: `testRuns`
 *
 * Repräsentiert einen vollständigen Test-Report.
 * Speichert ALLE Tests (passed, failed, skipped) basierend auf CTRF.
 */
export interface TestRun extends StabilifyTestReport {
  /** Eindeutige ID (UUID aus reportId) */
  id: string;
  /** Referenz zum Tenant */
  tenantId: string;

  // Metadaten für Firestore-Queries (dupliziert aus results für Indexing)
  /** Anzahl fehlgeschlagener Tests */
  failedCount: number;
  /** Anzahl bestandener Tests */
  passedCount: number;
  /** Gesamtdauer in ms */
  durationMs: number;
  /** Zeitstempel als Firestore Timestamp */
  createdAt: Timestamp;

  // AI Analyse
  /** Status der AI-Analyse */
  analysisStatus: AnalysisStatus;
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
 * Repräsentiert eine AI-generierte Lösung für einen Failure innerhalb eines TestRuns.
 */
export interface Solution {
  /** Eindeutige ID (Auto-generated) */
  id: string;
  /** Referenz zum Tenant */
  tenantId: string;
  /** Referenz zum TestRun */
  testRunId: string;
  /** Index des Tests im `results.tests` Array des TestRuns */
  testIndex: number;
  /** Test ID (aus StabilifyTestExtra) zur doppelten Sicherheit */
  testId: string;

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
