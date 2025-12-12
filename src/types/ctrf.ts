/**
 * CTRF (Common Test Report Format) Type Definitions
 *
 * Standardisierte Typen für Test-Reports, basierend auf dem CTRF-Schema.
 * Siehe: https://ctrf.io
 */

export type CtrfTestState =
  | "passed"
  | "failed"
  | "skipped"
  | "pending"
  | "other";

export interface CtrfTool {
  name: string;
  version?: string;
}

export interface CtrfSummary {
  tests: number;
  passed: number;
  failed: number;
  skipped: number;
  pending: number;
  other: number;
  suites?: number;
  start: number;
  stop: number;
}

export interface CtrfEnvironment {
  appName?: string;
  appVersion?: string;
  osPlatform?: string;
  osRelease?: string;
  osVersion?: string;
  buildName?: string;
  buildNumber?: string;
  buildUrl?: string;
  repositoryName?: string;
  repositoryUrl?: string;
  branchName?: string;
  commit?: string;
}

export interface CtrfStep {
  name: string;
  status: CtrfTestState;
}

export interface CtrfAttachment {
  name: string;
  contentType: string;
  path: string;
}

export interface CtrfTestAttempt {
  status: CtrfTestState;
  duration: number;
  message?: string;
  trace?: string;
  snippet?: string;
}

export interface CtrfTest {
  name: string;
  status: CtrfTestState;
  duration: number;
  start?: number;
  stop?: number;
  suite?: string;
  message?: string;
  trace?: string;
  snippet?: string;
  rawStatus?: string;
  tags?: string[];
  type?: string;
  filePath?: string;
  retries?: number;
  flaky?: boolean;
  browser?: string;
  device?: string;
  steps?: CtrfStep[];
  stdout?: string[];
  stderr?: string[];
  attachments?: CtrfAttachment[];
  retryAttempts?: CtrfTestAttempt[];
}

export interface CtrfReport {
  results: {
    tool: CtrfTool;
    summary: CtrfSummary;
    tests: CtrfTest[];
    environment?: CtrfEnvironment;
  };
}
