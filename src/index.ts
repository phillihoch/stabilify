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
  type SelfHealingReporterOptions,
} from "./self-healing-reporter";

// Text Sanitization Utilities Export
export {
  collapseEmptyLines,
  normalizeTabs,
  removeAnsiCodes,
  sanitizeText,
  sanitizeTextArray,
  trimTrailingWhitespace,
  type SanitizeOptions,
} from "./utils/text-sanitizer";
