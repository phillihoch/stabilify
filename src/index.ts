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

// Shared Types (used by reporter)
export { type AiModel, type CiProvider, type TenantPlan } from "./types/shared";
