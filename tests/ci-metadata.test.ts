import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  collectBranch,
  collectBuildUrl,
  collectCiMetadata,
  collectCommit,
  collectJobId,
  detectCiProvider,
} from "../src/utils/ci-metadata";

describe("CI Metadata", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    // Umgebung zurücksetzen
    process.env = {};
  });

  afterEach(() => {
    // Umgebung wiederherstellen
    process.env = { ...originalEnv };
  });

  describe("detectCiProvider", () => {
    it("sollte GitHub Actions erkennen", () => {
      process.env.GITHUB_ACTIONS = "true";
      expect(detectCiProvider()).toBe("github");
    });

    it("sollte GitLab CI erkennen", () => {
      process.env.GITLAB_CI = "true";
      expect(detectCiProvider()).toBe("gitlab");
    });

    it("sollte Jenkins erkennen", () => {
      process.env.JENKINS_URL = "https://jenkins.example.com";
      expect(detectCiProvider()).toBe("jenkins");
    });

    it("sollte CircleCI erkennen", () => {
      process.env.CIRCLECI = "true";
      expect(detectCiProvider()).toBe("circleci");
    });

    it("sollte Travis CI erkennen", () => {
      process.env.TRAVIS = "true";
      expect(detectCiProvider()).toBe("travis-ci");
    });

    it("sollte Azure Pipelines erkennen", () => {
      process.env.TF_BUILD = "True";
      expect(detectCiProvider()).toBe("azure-pipelines");
    });

    it("sollte Bitbucket Pipelines erkennen", () => {
      process.env.BITBUCKET_BUILD_NUMBER = "123";
      expect(detectCiProvider()).toBe("bitbucket-pipelines");
    });

    it("sollte TeamCity erkennen", () => {
      process.env.TEAMCITY_VERSION = "2023.11";
      expect(detectCiProvider()).toBe("teamcity");
    });

    it("sollte undefined zurückgeben wenn kein CI Provider erkannt wird", () => {
      expect(detectCiProvider()).toBeUndefined();
    });
  });

  describe("collectBranch", () => {
    it("sollte Branch von GitHub Actions sammeln", () => {
      process.env.GITHUB_REF = "refs/heads/main";
      expect(collectBranch()).toBe("main");
    });

    it("sollte Branch von GitHub Actions Pull Request sammeln", () => {
      process.env.GITHUB_REF = "refs/pull/123/merge";
      process.env.GITHUB_HEAD_REF = "feature-branch";
      expect(collectBranch()).toBe("feature-branch");
    });

    it("sollte Branch von GitLab CI sammeln", () => {
      process.env.CI_COMMIT_BRANCH = "develop";
      expect(collectBranch()).toBe("develop");
    });

    it("sollte Branch von Jenkins sammeln", () => {
      process.env.GIT_BRANCH = "origin/main";
      expect(collectBranch()).toBe("origin/main");
    });

    it("sollte Branch von CircleCI sammeln", () => {
      process.env.CIRCLE_BRANCH = "feature-x";
      expect(collectBranch()).toBe("feature-x");
    });

    it("sollte undefined zurückgeben wenn kein Branch gefunden wird", () => {
      expect(collectBranch()).toBeUndefined();
    });
  });

  describe("collectCommit", () => {
    it("sollte Commit von GitHub Actions sammeln", () => {
      process.env.GITHUB_SHA = "abc123def456";
      expect(collectCommit()).toBe("abc123def456");
    });

    it("sollte Commit von GitLab CI sammeln", () => {
      process.env.CI_COMMIT_SHA = "def456abc123";
      expect(collectCommit()).toBe("def456abc123");
    });

    it("sollte Commit von Jenkins sammeln", () => {
      process.env.GIT_COMMIT = "123abc456def";
      expect(collectCommit()).toBe("123abc456def");
    });

    it("sollte undefined zurückgeben wenn kein Commit gefunden wird", () => {
      expect(collectCommit()).toBeUndefined();
    });
  });

  describe("collectJobId", () => {
    it("sollte Job ID von GitHub Actions sammeln", () => {
      process.env.GITHUB_RUN_ID = "123456789";
      expect(collectJobId()).toBe("123456789");
    });

    it("sollte Job ID von GitLab CI sammeln", () => {
      process.env.CI_JOB_ID = "987654321";
      expect(collectJobId()).toBe("987654321");
    });

    it("sollte Job ID von Jenkins sammeln", () => {
      process.env.BUILD_ID = "42";
      expect(collectJobId()).toBe("42");
    });

    it("sollte undefined zurückgeben wenn keine Job ID gefunden wird", () => {
      expect(collectJobId()).toBeUndefined();
    });
  });

  describe("collectBuildUrl", () => {
    it("sollte Build URL von GitHub Actions sammeln", () => {
      process.env.GITHUB_SERVER_URL = "https://github.com";
      process.env.GITHUB_REPOSITORY = "owner/repo";
      process.env.GITHUB_RUN_ID = "123456789";
      expect(collectBuildUrl()).toBe(
        "https://github.com/owner/repo/actions/runs/123456789"
      );
    });

    it("sollte Build URL von GitLab CI sammeln", () => {
      process.env.CI_JOB_URL = "https://gitlab.com/project/-/jobs/123";
      expect(collectBuildUrl()).toBe("https://gitlab.com/project/-/jobs/123");
    });

    it("sollte Build URL von Jenkins sammeln", () => {
      process.env.BUILD_URL = "https://jenkins.example.com/job/test/42";
      expect(collectBuildUrl()).toBe("https://jenkins.example.com/job/test/42");
    });

    it("sollte undefined zurückgeben wenn keine Build URL gefunden wird", () => {
      expect(collectBuildUrl()).toBeUndefined();
    });
  });

  describe("collectCiMetadata", () => {
    it("sollte alle Metadaten von GitHub Actions sammeln", () => {
      process.env.GITHUB_ACTIONS = "true";
      process.env.GITHUB_REF = "refs/heads/main";
      process.env.GITHUB_SHA = "abc123";
      process.env.GITHUB_RUN_ID = "123456";
      process.env.GITHUB_SERVER_URL = "https://github.com";
      process.env.GITHUB_REPOSITORY = "owner/repo";

      const metadata = collectCiMetadata();

      expect(metadata.provider).toBe("github");
      expect(metadata.branch).toBe("main");
      expect(metadata.commit).toBe("abc123");
      expect(metadata.jobId).toBe("123456");
      expect(metadata.buildUrl).toBe(
        "https://github.com/owner/repo/actions/runs/123456"
      );
    });

    it("sollte leere Metadaten zurückgeben wenn keine CI-Umgebung erkannt wird", () => {
      const metadata = collectCiMetadata();

      expect(metadata.provider).toBeUndefined();
      expect(metadata.branch).toBeUndefined();
      expect(metadata.commit).toBeUndefined();
      expect(metadata.jobId).toBeUndefined();
      expect(metadata.buildUrl).toBeUndefined();
    });

    it("sollte partielle Metadaten sammeln wenn nicht alle Felder verfügbar sind", () => {
      process.env.GITHUB_ACTIONS = "true";
      process.env.GITHUB_REF = "refs/heads/feature";

      const metadata = collectCiMetadata();

      expect(metadata.provider).toBe("github");
      expect(metadata.branch).toBe("feature");
      expect(metadata.commit).toBeUndefined();
      expect(metadata.jobId).toBeUndefined();
      expect(metadata.buildUrl).toBeUndefined();
    });
  });
});
