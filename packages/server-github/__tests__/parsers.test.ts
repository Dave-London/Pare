import { describe, it, expect } from "vitest";
import {
  parsePrView,
  parsePrList,
  parsePrCreate,
  parsePrChecks,
  parseComment,
  parseIssueView,
  parseIssueList,
  parseIssueCreate,
  parseRunView,
  parseRunList,
} from "../src/lib/parsers.js";

describe("parsePrView", () => {
  it("parses full PR view JSON", () => {
    const json = JSON.stringify({
      number: 42,
      state: "OPEN",
      title: "Add new feature",
      body: "This PR adds a new feature.",
      mergeable: "MERGEABLE",
      reviewDecision: "APPROVED",
      statusCheckRollup: [
        { name: "CI", status: "COMPLETED", conclusion: "SUCCESS" },
        { name: "Lint", status: "COMPLETED", conclusion: "FAILURE" },
      ],
      url: "https://github.com/owner/repo/pull/42",
      headRefName: "feat/new-feature",
      baseRefName: "main",
      additions: 100,
      deletions: 20,
      changedFiles: 5,
    });

    const result = parsePrView(json);

    expect(result.number).toBe(42);
    expect(result.state).toBe("OPEN");
    expect(result.title).toBe("Add new feature");
    expect(result.body).toBe("This PR adds a new feature.");
    expect(result.mergeable).toBe("MERGEABLE");
    expect(result.reviewDecision).toBe("APPROVED");
    expect(result.checks).toHaveLength(2);
    expect(result.checks[0]).toEqual({
      name: "CI",
      status: "COMPLETED",
      conclusion: "SUCCESS",
    });
    expect(result.checks[1]).toEqual({
      name: "Lint",
      status: "COMPLETED",
      conclusion: "FAILURE",
    });
    expect(result.url).toBe("https://github.com/owner/repo/pull/42");
    expect(result.headBranch).toBe("feat/new-feature");
    expect(result.baseBranch).toBe("main");
    expect(result.additions).toBe(100);
    expect(result.deletions).toBe(20);
    expect(result.changedFiles).toBe(5);
  });

  it("handles missing optional fields", () => {
    const json = JSON.stringify({
      number: 1,
      state: "OPEN",
      title: "Minimal PR",
      headRefName: "fix/bug",
      baseRefName: "main",
      url: "https://github.com/owner/repo/pull/1",
    });

    const result = parsePrView(json);

    expect(result.body).toBeNull();
    expect(result.mergeable).toBe("UNKNOWN");
    expect(result.reviewDecision).toBe("");
    expect(result.checks).toEqual([]);
    expect(result.additions).toBe(0);
    expect(result.deletions).toBe(0);
    expect(result.changedFiles).toBe(0);
  });

  it("handles checks with context field instead of name", () => {
    const json = JSON.stringify({
      number: 5,
      state: "OPEN",
      title: "Test PR",
      headRefName: "test",
      baseRefName: "main",
      url: "https://github.com/owner/repo/pull/5",
      statusCheckRollup: [{ context: "ci/circleci", state: "SUCCESS", conclusion: null }],
    });

    const result = parsePrView(json);

    expect(result.checks[0]).toEqual({
      name: "ci/circleci",
      status: "SUCCESS",
      conclusion: null,
    });
  });
});

describe("parsePrList", () => {
  it("parses PR list JSON", () => {
    const json = JSON.stringify([
      {
        number: 10,
        state: "OPEN",
        title: "First PR",
        url: "https://github.com/owner/repo/pull/10",
        headRefName: "feat/first",
        author: { login: "alice" },
      },
      {
        number: 11,
        state: "MERGED",
        title: "Second PR",
        url: "https://github.com/owner/repo/pull/11",
        headRefName: "feat/second",
        author: { login: "bob" },
      },
    ]);

    const result = parsePrList(json);

    expect(result.total).toBe(2);
    expect(result.prs[0]).toEqual({
      number: 10,
      state: "OPEN",
      title: "First PR",
      url: "https://github.com/owner/repo/pull/10",
      headBranch: "feat/first",
      author: "alice",
    });
    expect(result.prs[1].author).toBe("bob");
  });

  it("handles empty list", () => {
    const result = parsePrList("[]");
    expect(result.total).toBe(0);
    expect(result.prs).toEqual([]);
  });

  it("handles missing author", () => {
    const json = JSON.stringify([
      {
        number: 1,
        state: "OPEN",
        title: "No author",
        url: "https://github.com/owner/repo/pull/1",
        headRefName: "fix/bug",
      },
    ]);

    const result = parsePrList(json);
    expect(result.prs[0].author).toBe("");
  });
});

describe("parsePrCreate", () => {
  it("parses PR create URL output", () => {
    const result = parsePrCreate("https://github.com/owner/repo/pull/99\n");

    expect(result.number).toBe(99);
    expect(result.url).toBe("https://github.com/owner/repo/pull/99");
  });

  it("handles URL without trailing newline", () => {
    const result = parsePrCreate("https://github.com/owner/repo/pull/1");
    expect(result.number).toBe(1);
  });

  it("returns 0 for unrecognized URL format", () => {
    const result = parsePrCreate("https://github.com/unknown-format");
    expect(result.number).toBe(0);
    expect(result.url).toBe("https://github.com/unknown-format");
  });
});

describe("parsePrChecks", () => {
  it("parses full PR checks JSON with summary", () => {
    const json = JSON.stringify([
      {
        name: "CI / build",
        state: "SUCCESS",
        bucket: "pass",
        description: "Build succeeded",
        event: "pull_request",
        workflow: "CI",
        link: "https://github.com/owner/repo/actions/runs/123/job/456",
        startedAt: "2024-01-15T10:00:00Z",
        completedAt: "2024-01-15T10:05:00Z",
      },
      {
        name: "CI / test",
        state: "FAILURE",
        bucket: "fail",
        description: "Tests failed",
        event: "pull_request",
        workflow: "CI",
        link: "https://github.com/owner/repo/actions/runs/123/job/789",
        startedAt: "2024-01-15T10:00:00Z",
        completedAt: "2024-01-15T10:06:00Z",
      },
      {
        name: "CI / lint",
        state: "PENDING",
        bucket: "pending",
        description: "",
        event: "pull_request",
        workflow: "CI",
        link: "https://github.com/owner/repo/actions/runs/123/job/101",
        startedAt: "2024-01-15T10:00:00Z",
        completedAt: "",
      },
    ]);

    const result = parsePrChecks(json, 42);

    expect(result.pr).toBe(42);
    expect(result.checks).toHaveLength(3);
    expect(result.checks[0]).toEqual({
      name: "CI / build",
      state: "SUCCESS",
      bucket: "pass",
      description: "Build succeeded",
      event: "pull_request",
      workflow: "CI",
      link: "https://github.com/owner/repo/actions/runs/123/job/456",
      startedAt: "2024-01-15T10:00:00Z",
      completedAt: "2024-01-15T10:05:00Z",
    });
    expect(result.summary.total).toBe(3);
    expect(result.summary.passed).toBe(1);
    expect(result.summary.failed).toBe(1);
    expect(result.summary.pending).toBe(1);
    expect(result.summary.skipped).toBe(0);
    expect(result.summary.cancelled).toBe(0);
  });

  it("handles empty checks list", () => {
    const result = parsePrChecks("[]", 10);

    expect(result.pr).toBe(10);
    expect(result.checks).toEqual([]);
    expect(result.summary).toEqual({
      total: 0,
      passed: 0,
      failed: 0,
      pending: 0,
      skipped: 0,
      cancelled: 0,
    });
  });

  it("handles missing optional fields", () => {
    const json = JSON.stringify([{ name: "check1" }]);

    const result = parsePrChecks(json, 5);

    expect(result.checks[0]).toEqual({
      name: "check1",
      state: "",
      bucket: "",
      description: "",
      event: "",
      workflow: "",
      link: "",
      startedAt: "",
      completedAt: "",
    });
  });

  it("counts skipping and cancel buckets", () => {
    const json = JSON.stringify([
      { name: "a", bucket: "skipping" },
      { name: "b", bucket: "cancel" },
      { name: "c", bucket: "pass" },
    ]);

    const result = parsePrChecks(json, 1);

    expect(result.summary.skipped).toBe(1);
    expect(result.summary.cancelled).toBe(1);
    expect(result.summary.passed).toBe(1);
    expect(result.summary.total).toBe(3);
  });

  it("parses all-pending checks (exit code 8 scenario)", () => {
    // When gh pr checks exits with code 8, it still returns valid JSON
    // with all checks in the "pending" bucket
    const json = JSON.stringify([
      {
        name: "CI / build",
        state: "PENDING",
        bucket: "pending",
        description: "",
        event: "pull_request",
        workflow: "CI",
        link: "https://github.com/owner/repo/actions/runs/123/job/456",
        startedAt: "2024-01-15T10:00:00Z",
        completedAt: "",
      },
      {
        name: "CI / test",
        state: "PENDING",
        bucket: "pending",
        description: "",
        event: "pull_request",
        workflow: "CI",
        link: "https://github.com/owner/repo/actions/runs/123/job/789",
        startedAt: "2024-01-15T10:00:00Z",
        completedAt: "",
      },
    ]);

    const result = parsePrChecks(json, 55);

    expect(result.pr).toBe(55);
    expect(result.checks).toHaveLength(2);
    expect(result.summary.total).toBe(2);
    expect(result.summary.pending).toBe(2);
    expect(result.summary.passed).toBe(0);
    expect(result.summary.failed).toBe(0);
  });

  it("parses mixed pending/complete checks (exit code 8 scenario)", () => {
    // Exit code 8 can also occur when some checks passed but others are still pending
    const json = JSON.stringify([
      {
        name: "CI / build",
        state: "SUCCESS",
        bucket: "pass",
        description: "Build succeeded",
        event: "pull_request",
        workflow: "CI",
        link: "",
        startedAt: "2024-01-15T10:00:00Z",
        completedAt: "2024-01-15T10:05:00Z",
      },
      {
        name: "CI / deploy",
        state: "PENDING",
        bucket: "pending",
        description: "",
        event: "pull_request",
        workflow: "CI",
        link: "",
        startedAt: "2024-01-15T10:05:00Z",
        completedAt: "",
      },
    ]);

    const result = parsePrChecks(json, 30);

    expect(result.pr).toBe(30);
    expect(result.summary.total).toBe(2);
    expect(result.summary.passed).toBe(1);
    expect(result.summary.pending).toBe(1);
    expect(result.summary.failed).toBe(0);
  });

  it("deduplicates checks by name, keeping most recent re-run", () => {
    const json = JSON.stringify([
      {
        name: "CI / build",
        state: "FAILURE",
        bucket: "fail",
        description: "Build failed",
        event: "pull_request",
        workflow: "CI",
        link: "",
        startedAt: "2024-01-15T10:00:00Z",
        completedAt: "2024-01-15T10:05:00Z",
      },
      {
        name: "CI / build",
        state: "SUCCESS",
        bucket: "pass",
        description: "Build succeeded on re-run",
        event: "pull_request",
        workflow: "CI",
        link: "",
        startedAt: "2024-01-15T11:00:00Z",
        completedAt: "2024-01-15T11:05:00Z",
      },
    ]);

    const result = parsePrChecks(json, 42);

    expect(result.checks).toHaveLength(1);
    expect(result.checks[0].state).toBe("SUCCESS");
    expect(result.checks[0].description).toBe("Build succeeded on re-run");
    expect(result.summary.total).toBe(1);
    expect(result.summary.passed).toBe(1);
    expect(result.summary.failed).toBe(0);
  });
});

describe("parseComment", () => {
  it("parses comment URL from stdout", () => {
    const result = parseComment("https://github.com/owner/repo/pull/42#issuecomment-123456\n");

    expect(result.url).toBe("https://github.com/owner/repo/pull/42#issuecomment-123456");
  });

  it("handles URL without trailing newline", () => {
    const result = parseComment("https://github.com/owner/repo/issues/1#issuecomment-1");
    expect(result.url).toBe("https://github.com/owner/repo/issues/1#issuecomment-1");
  });

  it("handles empty output", () => {
    const result = parseComment("");
    expect(result.url).toBeUndefined();
  });
});

describe("parseIssueView", () => {
  it("parses full issue view JSON", () => {
    const json = JSON.stringify({
      number: 15,
      state: "OPEN",
      title: "Bug report",
      body: "Steps to reproduce...",
      labels: [{ name: "bug" }, { name: "priority:high" }],
      assignees: [{ login: "alice" }, { login: "bob" }],
      url: "https://github.com/owner/repo/issues/15",
      createdAt: "2024-01-15T10:00:00Z",
    });

    const result = parseIssueView(json);

    expect(result.number).toBe(15);
    expect(result.state).toBe("OPEN");
    expect(result.title).toBe("Bug report");
    expect(result.body).toBe("Steps to reproduce...");
    expect(result.labels).toEqual(["bug", "priority:high"]);
    expect(result.assignees).toEqual(["alice", "bob"]);
    expect(result.url).toBe("https://github.com/owner/repo/issues/15");
    expect(result.createdAt).toBe("2024-01-15T10:00:00Z");
  });

  it("handles missing optional fields", () => {
    const json = JSON.stringify({
      number: 1,
      state: "CLOSED",
      title: "Minimal issue",
      url: "https://github.com/owner/repo/issues/1",
    });

    const result = parseIssueView(json);

    expect(result.body).toBeNull();
    expect(result.labels).toEqual([]);
    expect(result.assignees).toEqual([]);
    expect(result.createdAt).toBe("");
  });
});

describe("parseIssueList", () => {
  it("parses issue list JSON", () => {
    const json = JSON.stringify([
      {
        number: 1,
        state: "OPEN",
        title: "First issue",
        url: "https://github.com/owner/repo/issues/1",
        labels: [{ name: "bug" }],
        assignees: [{ login: "alice" }],
      },
      {
        number: 2,
        state: "CLOSED",
        title: "Second issue",
        url: "https://github.com/owner/repo/issues/2",
        labels: [],
        assignees: [],
      },
    ]);

    const result = parseIssueList(json);

    expect(result.total).toBe(2);
    expect(result.issues[0].labels).toEqual(["bug"]);
    expect(result.issues[0].assignees).toEqual(["alice"]);
    expect(result.issues[1].labels).toEqual([]);
    expect(result.issues[1].assignees).toEqual([]);
  });

  it("handles empty list", () => {
    const result = parseIssueList("[]");
    expect(result.total).toBe(0);
    expect(result.issues).toEqual([]);
  });
});

describe("parseIssueCreate", () => {
  it("parses issue create URL output", () => {
    const result = parseIssueCreate("https://github.com/owner/repo/issues/50\n");

    expect(result.number).toBe(50);
    expect(result.url).toBe("https://github.com/owner/repo/issues/50");
  });

  it("returns 0 for unrecognized URL format", () => {
    const result = parseIssueCreate("https://github.com/unknown");
    expect(result.number).toBe(0);
  });
});

describe("parseRunView", () => {
  it("parses full run view JSON", () => {
    const json = JSON.stringify({
      databaseId: 12345,
      status: "completed",
      conclusion: "success",
      name: "CI",
      workflowName: "Build and Test",
      headBranch: "main",
      jobs: [
        { name: "build", status: "completed", conclusion: "success" },
        { name: "test", status: "completed", conclusion: "success" },
      ],
      url: "https://github.com/owner/repo/actions/runs/12345",
      createdAt: "2024-01-15T10:00:00Z",
    });

    const result = parseRunView(json);

    expect(result.id).toBe(12345);
    expect(result.status).toBe("completed");
    expect(result.conclusion).toBe("success");
    expect(result.name).toBe("CI");
    expect(result.workflowName).toBe("Build and Test");
    expect(result.headBranch).toBe("main");
    expect(result.jobs).toHaveLength(2);
    expect(result.jobs[0]).toEqual({
      name: "build",
      status: "completed",
      conclusion: "success",
    });
    expect(result.url).toBe("https://github.com/owner/repo/actions/runs/12345");
    expect(result.createdAt).toBe("2024-01-15T10:00:00Z");
  });

  it("handles missing optional fields", () => {
    const json = JSON.stringify({
      databaseId: 1,
      status: "in_progress",
      headBranch: "feat/test",
      url: "https://github.com/owner/repo/actions/runs/1",
    });

    const result = parseRunView(json);

    expect(result.conclusion).toBeNull();
    expect(result.name).toBe("");
    expect(result.workflowName).toBe("");
    expect(result.jobs).toEqual([]);
    expect(result.createdAt).toBe("");
    expect(result.headSha).toBeUndefined();
    expect(result.event).toBeUndefined();
    expect(result.startedAt).toBeUndefined();
    expect(result.attempt).toBeUndefined();
  });

  it("handles jobs with null conclusion", () => {
    const json = JSON.stringify({
      databaseId: 100,
      status: "in_progress",
      headBranch: "main",
      url: "https://github.com/owner/repo/actions/runs/100",
      jobs: [{ name: "build", status: "in_progress", conclusion: null }],
    });

    const result = parseRunView(json);
    expect(result.jobs[0].conclusion).toBeNull();
  });

  it("parses headSha, event, startedAt, and attempt fields", () => {
    const json = JSON.stringify({
      databaseId: 54321,
      status: "completed",
      conclusion: "success",
      name: "CI",
      workflowName: "Build",
      headBranch: "main",
      jobs: [],
      url: "https://github.com/owner/repo/actions/runs/54321",
      createdAt: "2024-06-01T10:00:00Z",
      headSha: "abc123def456789012345678901234567890abcd",
      event: "push",
      startedAt: "2024-06-01T10:00:05Z",
      attempt: 2,
    });

    const result = parseRunView(json);

    expect(result.headSha).toBe("abc123def456789012345678901234567890abcd");
    expect(result.event).toBe("push");
    expect(result.startedAt).toBe("2024-06-01T10:00:05Z");
    expect(result.attempt).toBe(2);
  });
});

describe("parseRunList", () => {
  it("parses run list JSON", () => {
    const json = JSON.stringify([
      {
        databaseId: 100,
        status: "completed",
        conclusion: "success",
        name: "Build",
        workflowName: "CI",
        headBranch: "main",
        url: "https://github.com/owner/repo/actions/runs/100",
        createdAt: "2024-01-15T10:00:00Z",
      },
      {
        databaseId: 101,
        status: "in_progress",
        conclusion: null,
        name: "Test",
        workflowName: "CI",
        headBranch: "feat/test",
        url: "https://github.com/owner/repo/actions/runs/101",
        createdAt: "2024-01-15T11:00:00Z",
      },
    ]);

    const result = parseRunList(json);

    expect(result.total).toBe(2);
    expect(result.runs[0].id).toBe(100);
    expect(result.runs[0].conclusion).toBe("success");
    expect(result.runs[1].id).toBe(101);
    expect(result.runs[1].conclusion).toBeNull();
  });

  it("handles empty list", () => {
    const result = parseRunList("[]");
    expect(result.total).toBe(0);
    expect(result.runs).toEqual([]);
  });
});

// ── P1-gap #147: PR view reviews ────────────────────────────────────

describe("parsePrView — reviews (P1 #147)", () => {
  it("parses reviews array from PR view JSON", () => {
    const json = JSON.stringify({
      number: 42,
      state: "OPEN",
      title: "Add feature",
      headRefName: "feat/add",
      baseRefName: "main",
      url: "https://github.com/owner/repo/pull/42",
      reviews: [
        {
          author: { login: "alice" },
          state: "APPROVED",
          body: "LGTM!",
          submittedAt: "2024-06-01T12:00:00Z",
        },
        {
          author: { login: "bob" },
          state: "CHANGES_REQUESTED",
          body: "Please fix the typo",
          submittedAt: "2024-06-01T13:00:00Z",
        },
      ],
    });

    const result = parsePrView(json);

    expect(result.reviews).toHaveLength(2);
    expect(result.reviews![0]).toEqual({
      author: "alice",
      state: "APPROVED",
      body: "LGTM!",
      submittedAt: "2024-06-01T12:00:00Z",
    });
    expect(result.reviews![1]).toEqual({
      author: "bob",
      state: "CHANGES_REQUESTED",
      body: "Please fix the typo",
      submittedAt: "2024-06-01T13:00:00Z",
    });
  });

  it("returns undefined reviews when not present in JSON", () => {
    const json = JSON.stringify({
      number: 1,
      state: "OPEN",
      title: "No reviews",
      headRefName: "fix/bug",
      baseRefName: "main",
      url: "https://github.com/owner/repo/pull/1",
    });

    const result = parsePrView(json);
    expect(result.reviews).toBeUndefined();
  });

  it("handles reviews with empty body", () => {
    const json = JSON.stringify({
      number: 5,
      state: "OPEN",
      title: "Test",
      headRefName: "test",
      baseRefName: "main",
      url: "https://github.com/owner/repo/pull/5",
      reviews: [
        {
          author: { login: "carol" },
          state: "APPROVED",
          body: "",
          submittedAt: "2024-06-01T14:00:00Z",
        },
      ],
    });

    const result = parsePrView(json);
    expect(result.reviews![0].body).toBeUndefined();
  });
});

// ── P1-gap #148: Run list expanded fields ───────────────────────────

describe("parseRunList — expanded fields (P1 #148)", () => {
  it("parses headSha, event, startedAt, attempt from run list", () => {
    const json = JSON.stringify([
      {
        databaseId: 100,
        status: "completed",
        conclusion: "success",
        name: "Build",
        workflowName: "CI",
        headBranch: "main",
        url: "https://github.com/owner/repo/actions/runs/100",
        createdAt: "2024-01-15T10:00:00Z",
        headSha: "abc123def456789012345678901234567890abcd",
        event: "push",
        startedAt: "2024-01-15T10:00:05Z",
        attempt: 1,
      },
      {
        databaseId: 101,
        status: "completed",
        conclusion: "failure",
        name: "Test",
        workflowName: "CI",
        headBranch: "feat/test",
        url: "https://github.com/owner/repo/actions/runs/101",
        createdAt: "2024-01-15T11:00:00Z",
        headSha: "def456abc789012345678901234567890abcdef0",
        event: "pull_request",
        startedAt: "2024-01-15T11:00:03Z",
        attempt: 2,
      },
    ]);

    const result = parseRunList(json);

    expect(result.runs[0].headSha).toBe("abc123def456789012345678901234567890abcd");
    expect(result.runs[0].event).toBe("push");
    expect(result.runs[0].startedAt).toBe("2024-01-15T10:00:05Z");
    expect(result.runs[0].attempt).toBe(1);

    expect(result.runs[1].headSha).toBe("def456abc789012345678901234567890abcdef0");
    expect(result.runs[1].event).toBe("pull_request");
    expect(result.runs[1].startedAt).toBe("2024-01-15T11:00:03Z");
    expect(result.runs[1].attempt).toBe(2);
  });

  it("handles missing expanded fields gracefully", () => {
    const json = JSON.stringify([
      {
        databaseId: 200,
        status: "in_progress",
        conclusion: null,
        name: "Build",
        workflowName: "CI",
        headBranch: "main",
        url: "https://url",
        createdAt: "2024-01-15T10:00:00Z",
      },
    ]);

    const result = parseRunList(json);

    expect(result.runs[0].headSha).toBeUndefined();
    expect(result.runs[0].event).toBeUndefined();
    expect(result.runs[0].startedAt).toBeUndefined();
    expect(result.runs[0].attempt).toBeUndefined();
  });
});

// ── P1-gap #149: Run rerun attempt tracking ─────────────────────────

import { parseRunRerun } from "../src/lib/parsers.js";

describe("parseRunRerun — attempt tracking (P1 #149)", () => {
  it("extracts attempt number from output", () => {
    const result = parseRunRerun("", "✓ Requested rerun of run 12345 (attempt #3)", 12345, false);

    expect(result.attempt).toBe(3);
  });

  it("extracts new run URL when multiple URLs present", () => {
    const stdout = "https://github.com/owner/repo/actions/runs/12345";
    const stderr = "✓ Rerun started: https://github.com/owner/repo/actions/runs/12346";
    const result = parseRunRerun(stdout, stderr, 12345, false);

    expect(result.url).toBe("https://github.com/owner/repo/actions/runs/12345");
    expect(result.newRunUrl).toBe("https://github.com/owner/repo/actions/runs/12346");
  });

  it("does not set newRunUrl when only one URL present", () => {
    const result = parseRunRerun(
      "https://github.com/owner/repo/actions/runs/12345",
      "",
      12345,
      false,
    );

    expect(result.newRunUrl).toBeUndefined();
  });

  it("handles output with no attempt info", () => {
    const result = parseRunRerun("", "✓ Requested rerun of run 12345", 12345, false);

    expect(result.attempt).toBeUndefined();
    expect(result.newRunUrl).toBeUndefined();
  });
});
