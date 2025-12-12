/**
 * Shared Type Definitions
 *
 * Gemeinsam genutzte Typen und Enums, um Zirkelbezüge zu vermeiden.
 */

/**
 * Unterstützte CI/CD Provider.
 */
export type CiProvider =
  | "github" // GitHub Actions
  | "gitlab" // GitLab CI
  | "jenkins"
  | "circleci"
  | "travis-ci"
  | "azure-pipelines"
  | "bitbucket-pipelines"
  | "teamcity";

/**
 * Verfügbare Tarif-Pläne.
 */
export type TenantPlan = "free" | "pro" | "enterprise";

/**
 * Unterstützte AI-Modelle für die Fehleranalyse.
 */
export type AiModel = "gpt-4o" | "gemini-1.5-pro";
