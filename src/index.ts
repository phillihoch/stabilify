/**
 * Stabilify - AI-powered auto-healing for Playwright tests
 *
 * @packageDocumentation
 */

// Reporter Export
export {
  StabilifyReporter as Reporter,
  // Deprecated Alias
  StabilifyReporter as SelfHealingReporter,
  default as StabilifyReporter,
  type StabilifyReporterOptions,
  type UploadOptions,
} from "./reporter/stabilify-reporter";

// Report Types
export type {
  StabilifyEnvironment,
  StabilifyTest,
  StabilifyTestReport,
  StabilifyTestSummary,
} from "./types/stabilify-report";

export type {
  CtrfEnvironment,
  CtrfReport,
  CtrfSummary,
  CtrfTest,
} from "./types/ctrf";

// Uploader Export
export {
  StabilifyUploader,
  type FileToUpload,
  type FileType,
  type UploaderOptions,
} from "./uploader/stabilify-uploader";

// Firestore Types Export
export {
  type AnalysisStatus,
  // Interfaces
  type ApiKey,
  // Enums / Type Aliases
  type ApiKeyScope,
  type Solution,
  type SolutionCategory,
  type SolutionStrategy,
  type SolutionStrategyType,
  type Tenant,
  type TenantSettings,
  type TestRun,
  type TokenUsage,
} from "./types/firestore";

// Shared Types
export { type AiModel, type CiProvider, type TenantPlan } from "./types/shared";
