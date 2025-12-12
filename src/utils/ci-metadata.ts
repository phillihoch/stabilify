/**
 * CI/CD Metadaten-Sammlung
 *
 * Dieses Modul sammelt automatisch Metadaten aus verschiedenen CI/CD-Umgebungen
 * wie GitHub Actions, GitLab CI, Jenkins, CircleCI, etc.
 *
 * @module utils/ci-metadata
 */

import type { CiProvider } from "../types/shared";

/**
 * CI/CD Metadaten für einen Test-Run
 */
export interface CiMetadata {
  /** CI Provider (z.B. "github-actions", "gitlab-ci") */
  provider?: CiProvider;
  /** Git Branch Name */
  branch?: string;
  /** Git Commit Hash */
  commit?: string;
  /** CI Job ID */
  jobId?: string;
  /** CI Build URL */
  buildUrl?: string;
}

/**
 * Erkennt den aktuellen CI Provider anhand von Umgebungsvariablen
 */
export function detectCiProvider(): CiProvider | undefined {
  const env = process.env;

  // GitHub Actions
  if (env.GITHUB_ACTIONS === "true") {
    return "github";
  }

  // GitLab CI
  if (env.GITLAB_CI === "true") {
    return "gitlab";
  }

  // Jenkins
  if (env.JENKINS_URL || env.JENKINS_HOME) {
    return "jenkins";
  }

  // CircleCI
  if (env.CIRCLECI === "true") {
    return "circleci";
  }

  // Travis CI
  if (env.TRAVIS === "true") {
    return "travis-ci";
  }

  // Azure Pipelines
  if (env.TF_BUILD === "True") {
    return "azure-pipelines";
  }

  // Bitbucket Pipelines
  if (env.BITBUCKET_BUILD_NUMBER) {
    return "bitbucket-pipelines";
  }

  // TeamCity
  if (env.TEAMCITY_VERSION) {
    return "teamcity";
  }

  return undefined;
}

/**
 * Sammelt Git Branch aus verschiedenen CI-Umgebungen
 */
export function collectBranch(): string | undefined {
  const env = process.env;

  // GitHub Actions
  if (env.GITHUB_REF) {
    // GITHUB_REF format: refs/heads/main oder refs/pull/123/merge
    const match = new RegExp(/refs\/heads\/(.+)/).exec(env.GITHUB_REF);
    if (match) return match[1];
    // Für Pull Requests
    if (env.GITHUB_HEAD_REF) return env.GITHUB_HEAD_REF;
  }

  // GitLab CI
  if (env.CI_COMMIT_BRANCH) return env.CI_COMMIT_BRANCH;
  if (env.CI_MERGE_REQUEST_SOURCE_BRANCH_NAME)
    return env.CI_MERGE_REQUEST_SOURCE_BRANCH_NAME;

  // Jenkins
  if (env.GIT_BRANCH) return env.GIT_BRANCH;
  if (env.BRANCH_NAME) return env.BRANCH_NAME;

  // CircleCI
  if (env.CIRCLE_BRANCH) return env.CIRCLE_BRANCH;

  // Travis CI
  if (env.TRAVIS_BRANCH) return env.TRAVIS_BRANCH;

  // Azure Pipelines
  if (env.BUILD_SOURCEBRANCH) {
    const match = new RegExp(/refs\/heads\/(.+)/).exec(env.BUILD_SOURCEBRANCH);
    if (match) return match[1];
  }

  // Bitbucket Pipelines
  if (env.BITBUCKET_BRANCH) return env.BITBUCKET_BRANCH;

  return undefined;
}

/**
 * Sammelt Git Commit Hash aus verschiedenen CI-Umgebungen
 */
export function collectCommit(): string | undefined {
  const env = process.env;

  // GitHub Actions
  if (env.GITHUB_SHA) return env.GITHUB_SHA;

  // GitLab CI
  if (env.CI_COMMIT_SHA) return env.CI_COMMIT_SHA;

  // Jenkins
  if (env.GIT_COMMIT) return env.GIT_COMMIT;

  // CircleCI
  if (env.CIRCLE_SHA1) return env.CIRCLE_SHA1;

  // Travis CI
  if (env.TRAVIS_COMMIT) return env.TRAVIS_COMMIT;

  // Azure Pipelines
  if (env.BUILD_SOURCEVERSION) return env.BUILD_SOURCEVERSION;

  // Bitbucket Pipelines
  if (env.BITBUCKET_COMMIT) return env.BITBUCKET_COMMIT;

  return undefined;
}

/**
 * Sammelt CI Job ID aus verschiedenen CI-Umgebungen
 */
export function collectJobId(): string | undefined {
  const env = process.env;

  // GitHub Actions
  if (env.GITHUB_RUN_ID) return env.GITHUB_RUN_ID;

  // GitLab CI
  if (env.CI_JOB_ID) return env.CI_JOB_ID;

  // Jenkins
  if (env.BUILD_ID) return env.BUILD_ID;

  // CircleCI
  if (env.CIRCLE_BUILD_NUM) return env.CIRCLE_BUILD_NUM;

  // Travis CI
  if (env.TRAVIS_BUILD_ID) return env.TRAVIS_BUILD_ID;

  // Azure Pipelines
  if (env.BUILD_BUILDID) return env.BUILD_BUILDID;

  // Bitbucket Pipelines
  if (env.BITBUCKET_BUILD_NUMBER) return env.BITBUCKET_BUILD_NUMBER;

  return undefined;
}

/**
 * Sammelt CI Build URL aus verschiedenen CI-Umgebungen
 */
export function collectBuildUrl(): string | undefined {
  const env = process.env;

  // GitHub Actions
  if (env.GITHUB_SERVER_URL && env.GITHUB_REPOSITORY && env.GITHUB_RUN_ID) {
    return `${env.GITHUB_SERVER_URL}/${env.GITHUB_REPOSITORY}/actions/runs/${env.GITHUB_RUN_ID}`;
  }

  // GitLab CI
  if (env.CI_JOB_URL) return env.CI_JOB_URL;

  // Jenkins
  if (env.BUILD_URL) return env.BUILD_URL;

  // CircleCI
  if (env.CIRCLE_BUILD_URL) return env.CIRCLE_BUILD_URL;

  // Travis CI
  if (env.TRAVIS_BUILD_WEB_URL) return env.TRAVIS_BUILD_WEB_URL;

  // Azure Pipelines
  if (
    env.SYSTEM_TEAMFOUNDATIONCOLLECTIONURI &&
    env.SYSTEM_TEAMPROJECT &&
    env.BUILD_BUILDID
  ) {
    return `${env.SYSTEM_TEAMFOUNDATIONCOLLECTIONURI}${env.SYSTEM_TEAMPROJECT}/_build/results?buildId=${env.BUILD_BUILDID}`;
  }

  return undefined;
}

/**
 * Sammelt alle CI/CD Metadaten
 */
export function collectCiMetadata(): CiMetadata {
  return {
    provider: detectCiProvider(),
    branch: collectBranch(),
    commit: collectCommit(),
    jobId: collectJobId(),
    buildUrl: collectBuildUrl(),
  };
}
