/**
 * Stabilify - AI-powered auto-healing for Playwright tests
 *
 * @packageDocumentation
 */

// Self-Healing Reporter Export
export {
  SelfHealingReporter as Reporter,
  default as SelfHealingReporter,
  type CollectedFailure,
  type ReportEnvironment,
  type SelfHealingReporterOptions,
} from "./self-healing-reporter";

// Firestore Types Export
export {
  type AiModel,
  // ApiKey
  type ApiKey,
  // Enums / Type Aliases
  type ApiKeyScope,
  type CiProvider,
  type ErrorContext,
  type Failure,
  type FailureAnalysisStatus,
  type FailureError,
  type FailureMedia,
  type FailureStatus,
  type FailureStep,
  type FailureStepStatus,
  type FileLocation,
  type Solution,
  type SolutionCategory,
  // Solution
  type SolutionStrategy,
  type SolutionStrategyType,
  // Failure
  type SourceLocation,
  type Tenant,
  type TenantPlan,
  // Tenant
  type TenantSettings,
  // TestRun
  type TestRun,
  type TestRunStatus,
  type TokenUsage,
} from "./types/firestore";
