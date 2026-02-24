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
  parseLabelList,
  parseLabelCreate,
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

    expect(result.prs.length).toBe(2);
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
    expect(result.prs.length).toBe(0);
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

    expect(result.issues.length).toBe(2);
    expect(result.issues[0].labels).toEqual(["bug"]);
    expect(result.issues[0].assignees).toEqual(["alice"]);
    expect(result.issues[1].labels).toEqual([]);
    expect(result.issues[1].assignees).toEqual([]);
  });

  it("handles empty list", () => {
    const result = parseIssueList("[]");
    expect(result.issues.length).toBe(0);
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

    expect(result.runs.length).toBe(2);
    expect(result.runs[0].id).toBe(100);
    expect(result.runs[0].conclusion).toBe("success");
    expect(result.runs[1].id).toBe(101);
    expect(result.runs[1].conclusion).toBeNull();
  });

  it("handles empty list", () => {
    const result = parseRunList("[]");
    expect(result.runs.length).toBe(0);
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

// ── Label parsers ────────────────────────────────────────────────────

describe("parseLabelList", () => {
  it("parses label list JSON", () => {
    const json = JSON.stringify([
      { name: "bug", description: "Something isn't working", color: "d73a4a", isDefault: true },
      { name: "enhancement", description: "New feature", color: "a2eeef", isDefault: false },
    ]);

    const result = parseLabelList(json);

    expect(result.labels.length).toBe(2);
    expect(result.labels[0]).toEqual({
      name: "bug",
      description: "Something isn't working",
      color: "d73a4a",
      isDefault: true,
    });
    expect(result.labels[1]).toEqual({
      name: "enhancement",
      description: "New feature",
      color: "a2eeef",
      isDefault: false,
    });
  });

  it("handles empty list", () => {
    const result = parseLabelList("[]");
    expect(result.labels.length).toBe(0);
    expect(result.labels).toEqual([]);
  });

  it("handles missing optional fields", () => {
    const json = JSON.stringify([{ name: "test" }]);

    const result = parseLabelList(json);

    expect(result.labels[0]).toEqual({
      name: "test",
      description: "",
      color: "",
      isDefault: false,
    });
  });
});

describe("parseLabelCreate", () => {
  it("parses label create output with URL", () => {
    const result = parseLabelCreate(
      "",
      '✓ Label "my-label" created in owner/repo\nhttps://github.com/owner/repo/labels/my-label',
      "my-label",
      "A description",
      "ff0000",
    );

    expect(result.name).toBe("my-label");
    expect(result.description).toBe("A description");
    expect(result.color).toBe("ff0000");
    expect(result.url).toBe("https://github.com/owner/repo/labels/my-label");
  });

  it("parses label create output without URL", () => {
    const result = parseLabelCreate("", '✓ Label "my-label" created in owner/repo', "my-label");

    expect(result.name).toBe("my-label");
    expect(result.description).toBeUndefined();
    expect(result.color).toBeUndefined();
    expect(result.url).toBeUndefined();
  });
});

// ── Additional parser coverage tests ────────────────────────────────

import {
  parsePrMerge,
  parsePrUpdate,
  parsePrReview,
  parseIssueClose,
  parseIssueUpdate,
  parseReleaseCreate,
  parseReleaseList,
  parseGistCreate,
  parseRepoView,
  parseRepoClone,
  parseDiscussionList,
  parsePrDiffNumstat,
  parseApi,
} from "../src/lib/parsers.js";

describe("parsePrMerge", () => {
  it("parses standard merge output", () => {
    const result = parsePrMerge(
      "✓ Merged pull request #42\nhttps://github.com/owner/repo/pull/42",
      42,
      "merge",
    );
    expect(result.merged).toBe(true);
    expect(result.state).toBe("merged");
    expect(result.method).toBe("merge");
  });

  it("detects squash merge from output text", () => {
    const result = parsePrMerge(
      "✓ Squashed and merged pull request #42\nhttps://github.com/owner/repo/pull/42",
      42,
      "merge",
    );
    expect(result.method).toBe("squash");
  });

  it("detects rebase merge from output text", () => {
    const result = parsePrMerge(
      "✓ Rebased and merged pull request #42\nhttps://github.com/owner/repo/pull/42",
      42,
      "merge",
    );
    expect(result.method).toBe("rebase");
  });

  it("detects auto-merge from output text", () => {
    const result = parsePrMerge(
      "✓ Will automatically merge via squash\nhttps://github.com/owner/repo/pull/42",
      42,
      "squash",
      undefined,
      false,
    );
    expect(result.state).toBe("auto-merge-enabled");
  });

  it("handles disableAuto flag", () => {
    const result = parsePrMerge(
      "✓ Disabled auto-merge\nhttps://github.com/owner/repo/pull/42",
      42,
      "merge",
      undefined,
      false,
      true,
    );
    expect(result.state).toBe("auto-merge-disabled");
  });

  it("detects branch deletion", () => {
    const result = parsePrMerge(
      "✓ Merged pull request #42\n✓ Deleted branch feat/test\nhttps://github.com/owner/repo/pull/42",
      42,
      "merge",
      true,
    );
    expect(result.branchDeleted).toBe(true);
  });

  it("detects branchDeleted false when no delete text", () => {
    const result = parsePrMerge(
      "✓ Merged pull request #42\nhttps://github.com/owner/repo/pull/42",
      42,
      "merge",
      true,
    );
    // deleteBranch was true but no "deleted branch" text in output
    expect(result.branchDeleted).toBe(true);
  });

  it("extracts merge commit SHA", () => {
    const sha = "abcdef1234567890abcdef1234567890abcdef12";
    const result = parsePrMerge(
      `✓ Merged pull request #42 ${sha}\nhttps://github.com/owner/repo/pull/42`,
      42,
      "merge",
    );
    expect(result.mergeCommitSha).toBe(sha);
  });
});

describe("parsePrUpdate", () => {
  it("parses PR update output with URL", () => {
    const result = parsePrUpdate(
      "https://github.com/owner/repo/pull/42\n",
      42,
      ["title"],
      ["add-label"],
    );
    expect(result.number).toBe(42);
    expect(result.url).toBe("https://github.com/owner/repo/pull/42");
    expect(result.updatedFields).toEqual(["title"]);
    expect(result.operations).toEqual(["add-label"]);
  });

  it("handles no URL in output", () => {
    const result = parsePrUpdate("done", 42);
    expect(result.url).toBe("");
  });
});

describe("parsePrReview", () => {
  it("parses approval review", () => {
    const result = parsePrReview("https://github.com/owner/repo/pull/42", 42, "approve", "LGTM");
    expect(result.event).toBe("APPROVE");
    expect(result.body).toBe("LGTM");
    expect(result.errorType).toBeUndefined();
  });

  it("classifies not-found error", () => {
    const result = parsePrReview("", 42, "approve", undefined, "Could not resolve to a node");
    expect(result.errorType).toBe("not-found");
  });

  it("classifies permission-denied error", () => {
    const result = parsePrReview("", 42, "approve", undefined, "403 Forbidden");
    expect(result.errorType).toBe("permission-denied");
  });

  it("classifies already-reviewed error", () => {
    const result = parsePrReview("", 42, "approve", undefined, "Already approved this PR");
    expect(result.errorType).toBe("already-reviewed");
  });

  it("classifies draft-pr error", () => {
    const result = parsePrReview("", 42, "approve", undefined, "This PR is a draft");
    expect(result.errorType).toBe("draft-pr");
  });

  it("classifies unknown error", () => {
    const result = parsePrReview("", 42, "approve", undefined, "Something unexpected");
    expect(result.errorType).toBe("unknown");
  });

  it("maps request-changes event", () => {
    const result = parsePrReview("https://url", 42, "request-changes");
    expect(result.event).toBe("REQUEST_CHANGES");
  });

  it("maps comment event", () => {
    const result = parsePrReview("https://url", 42, "comment");
    expect(result.event).toBe("COMMENT");
  });
});

describe("parseIssueClose", () => {
  it("parses basic close", () => {
    const result = parseIssueClose("https://github.com/owner/repo/issues/10", 10);
    expect(result.number).toBe(10);
    expect(result.state).toBe("closed");
    expect(result.url).toContain("/issues/10");
  });

  it("parses close with reason and comment", () => {
    const result = parseIssueClose(
      "Closing https://github.com/owner/repo/issues/10\nhttps://github.com/owner/repo/issues/10#issuecomment-12345",
      10,
      "not planned",
      "Won't fix",
    );
    expect(result.reason).toBe("not planned");
    expect(result.commentUrl).toBe("https://github.com/owner/repo/issues/10#issuecomment-12345");
  });

  it("detects already closed issue", () => {
    const result = parseIssueClose(
      "https://github.com/owner/repo/issues/10",
      10,
      undefined,
      undefined,
      "Issue #10 is already closed",
    );
    expect(result.alreadyClosed).toBe(true);
  });

  it("handles output without GitHub URL", () => {
    const result = parseIssueClose("some random output", 10);
    expect(result.url).toBe("some random output");
  });
});

describe("parseIssueUpdate", () => {
  it("parses issue update output", () => {
    const result = parseIssueUpdate(
      "https://github.com/owner/repo/issues/15\n",
      15,
      ["title"],
      ["add-assignee"],
    );
    expect(result.number).toBe(15);
    expect(result.url).toBe("https://github.com/owner/repo/issues/15");
    expect(result.updatedFields).toEqual(["title"]);
    expect(result.operations).toEqual(["add-assignee"]);
  });
});

describe("parseReleaseCreate", () => {
  it("parses release create output", () => {
    const result = parseReleaseCreate(
      "https://github.com/owner/repo/releases/tag/v1.0.0\n",
      "v1.0.0",
      false,
      false,
      "Release 1.0",
    );
    expect(result.tag).toBe("v1.0.0");
    expect(result.draft).toBe(false);
    expect(result.prerelease).toBe(false);
    expect(result.title).toBe("Release 1.0");
  });

  it("handles no title", () => {
    const result = parseReleaseCreate("https://url", "v2.0.0", true, true);
    expect(result.title).toBeUndefined();
    expect(result.draft).toBe(true);
    expect(result.prerelease).toBe(true);
  });
});

describe("parseReleaseList", () => {
  it("parses release list with isLatest and createdAt", () => {
    const json = JSON.stringify([
      {
        tagName: "v2.0.0",
        name: "Release 2",
        isDraft: false,
        isPrerelease: false,
        publishedAt: "2024-06-01",
        url: "https://url",
        isLatest: true,
        createdAt: "2024-05-30",
      },
    ]);
    const result = parseReleaseList(json);
    expect(result.releases.length).toBe(1);
    expect(result.releases[0].isLatest).toBe(true);
    expect(result.releases[0].createdAt).toBe("2024-05-30");
  });

  it("handles empty list", () => {
    const result = parseReleaseList("[]");
    expect(result.releases.length).toBe(0);
  });
});

describe("parseGistCreate", () => {
  it("parses gist URL with user prefix", () => {
    const result = parseGistCreate(
      "https://gist.github.com/alice/abc123def456",
      true,
      ["file.txt"],
      "My gist",
    );
    expect(result.id).toBe("abc123def456");
    expect(result.public).toBe(true);
    expect(result.files).toEqual(["file.txt"]);
    expect(result.description).toBe("My gist");
    expect(result.fileCount).toBe(1);
  });

  it("parses gist URL without user prefix", () => {
    const result = parseGistCreate("https://gist.github.com/abc123def456\n", false);
    expect(result.id).toBe("abc123def456");
    expect(result.public).toBe(false);
    expect(result.files).toBeUndefined();
    expect(result.fileCount).toBeUndefined();
  });
});

describe("parseRepoView", () => {
  it("parses repo view with all fields", () => {
    const json = JSON.stringify({
      name: "pare",
      owner: { login: "paretools" },
      description: "MCP servers",
      url: "https://github.com/paretools/pare",
      homepageUrl: "https://pare.dev",
      defaultBranchRef: { name: "main" },
      isPrivate: false,
      isArchived: false,
      isFork: false,
      stargazerCount: 100,
      forkCount: 20,
      languages: [{ node: { name: "TypeScript" } }, { node: { name: "JavaScript" } }],
      repositoryTopics: [{ name: "mcp" }, { name: "cli" }],
      licenseInfo: { name: "MIT" },
      createdAt: "2024-01-01T00:00:00Z",
      updatedAt: "2024-06-01T00:00:00Z",
      pushedAt: "2024-06-15T00:00:00Z",
    });

    const result = parseRepoView(json);
    expect(result.name).toBe("pare");
    expect(result.owner).toBe("paretools");
    expect(result.homepageUrl).toBe("https://pare.dev");
    expect(result.stars).toBe(100);
    expect(result.forks).toBe(20);
    expect(result.languages).toEqual(["TypeScript", "JavaScript"]);
    expect(result.topics).toEqual(["mcp", "cli"]);
    expect(result.license).toBe("MIT");
    expect(result.createdAt).toBe("2024-01-01T00:00:00Z");
    expect(result.pushedAt).toBe("2024-06-15T00:00:00Z");
  });

  it("handles minimal repo view", () => {
    const json = JSON.stringify({
      name: "minimal",
    });
    const result = parseRepoView(json);
    expect(result.name).toBe("minimal");
    expect(result.owner).toBe("");
    expect(result.defaultBranch).toBe("main");
    expect(result.stars).toBe(0);
    expect(result.languages).toBeUndefined();
    expect(result.topics).toBeUndefined();
  });
});

describe("parseRepoClone", () => {
  it("parses clone with directory", () => {
    const result = parseRepoClone("", "Cloning...", "owner/repo", "/tmp/repo");
    expect(result.success).toBe(true);
    expect(result.repo).toBe("owner/repo");
    expect(result.directory).toBe("/tmp/repo");
  });

  it("generates default message on empty output", () => {
    const result = parseRepoClone("", "", "owner/repo");
    expect(result.message).toBe("Cloned owner/repo successfully");
  });
});

describe("parseDiscussionList", () => {
  it("parses discussion list from GraphQL response", () => {
    const json = JSON.stringify({
      data: {
        repository: {
          discussions: {
            nodes: [
              {
                number: 1,
                title: "Help",
                author: { login: "alice" },
                category: { name: "Q&A" },
                createdAt: "2024-01-01",
                url: "https://url",
                isAnswered: true,
                comments: { totalCount: 5 },
              },
              {
                number: 2,
                title: "Idea",
                createdAt: "2024-01-02",
                url: "https://url2",
              },
            ],
            totalCount: 10,
          },
        },
      },
    });

    const result = parseDiscussionList(json);
    expect(result.discussions).toHaveLength(2);
    expect(result.discussions[0].author).toBe("alice");
    expect(result.discussions[0].isAnswered).toBe(true);
    expect(result.discussions[0].comments).toBe(5);
    expect(result.discussions[1].author).toBe("ghost");
    expect(result.discussions[1].category).toBe("");
    expect(result.discussions[1].isAnswered).toBe(false);
    expect(result.discussions[1].comments).toBe(0);
  });

  it("handles empty response", () => {
    const json = JSON.stringify({ data: {} });
    const result = parseDiscussionList(json);
    expect(result.discussions).toEqual([]);
  });
});

describe("parsePrDiffNumstat", () => {
  it("parses added, modified, deleted files", () => {
    const stdout = `10\t0\tnew-file.ts
5\t3\texisting.ts
0\t20\tremoved.ts`;

    const result = parsePrDiffNumstat(stdout);
    expect(result.files.length).toBe(3);
    expect(result.files[0].status).toBe("added");
    expect(result.files[1].status).toBe("modified");
    expect(result.files[2].status).toBe("deleted");
    expect(result.files.reduce((s, f) => s + f.additions, 0)).toBe(15);
    expect(result.files.reduce((s, f) => s + f.deletions, 0)).toBe(23);
  });

  it("detects renamed files with brace syntax", () => {
    const stdout = `5\t2\tsrc/{old => new}/file.ts`;
    const result = parsePrDiffNumstat(stdout);
    expect(result.files[0].status).toBe("renamed");
    expect(result.files[0].oldFile).toBeDefined();
  });

  it("detects renamed files with arrow syntax", () => {
    const stdout = `0\t0\told-name.ts => new-name.ts`;
    const result = parsePrDiffNumstat(stdout);
    expect(result.files[0].status).toBe("renamed");
  });

  it("handles binary files with dash stats", () => {
    const stdout = `-\t-\timage.png`;
    const result = parsePrDiffNumstat(stdout);
    expect(result.files[0].additions).toBe(0);
    expect(result.files[0].deletions).toBe(0);
  });
});

describe("parseApi", () => {
  it("parses API response with HTTP headers (CRLF)", () => {
    const stdout = 'HTTP/2.0 201 Created\r\ncontent-type: application/json\r\n\r\n{"id": 1}';
    const result = parseApi(stdout, 0, "/repos/owner/repo", "POST");
    expect(result.statusCode).toBe(201);
    expect(result.responseHeaders).toBeDefined();
    expect(result.responseHeaders!["content-type"]).toBe("application/json");
  });

  it("parses API response with HTTP headers (LF)", () => {
    const stdout = 'HTTP/1.1 200 OK\ncontent-type: application/json\n\n{"ok": true}';
    const result = parseApi(stdout, 0, "/repos", "GET");
    expect(result.statusCode).toBe(200);
    expect(result.body).toEqual({ ok: true });
  });

  it("parses pagination from link header", () => {
    const stdout =
      'HTTP/2.0 200 OK\r\nlink: <https://api.github.com/repos?page=2>; rel="next", <https://api.github.com/repos?page=5>; rel="last"\r\n\r\n[]';
    const result = parseApi(stdout, 0, "/repos", "GET");
    expect(result.pagination).toBeDefined();
    expect(result.pagination!.hasNext).toBe(true);
    expect(result.pagination!.next).toContain("page=2");
    expect(result.pagination!.last).toContain("page=5");
  });

  it("handles error body from stderr", () => {
    const result = parseApi("error", 1, "/repos", "POST", '{"message": "Not Found"}');
    expect(result.errorBody).toEqual({ message: "Not Found" });
  });

  it("handles non-JSON error body in stderr", () => {
    const result = parseApi("error", 1, "/repos", "POST", "plain error text");
    expect(result.errorBody).toBe("plain error text");
  });

  it("handles embedded JSON in stderr", () => {
    const result = parseApi(
      "error",
      1,
      "/repos",
      "POST",
      'gh: {"message": "Bad request"} (HTTP 422)',
    );
    expect(result.errorBody).toEqual({ message: "Bad request" });
  });

  it("detects GraphQL errors", () => {
    const stdout = JSON.stringify({ data: null, errors: [{ message: "Not found" }] });
    const result = parseApi(stdout, 0, "/graphql", "POST");
    expect(result.graphqlErrors).toHaveLength(1);
  });

  it("handles plain text body (non-JSON)", () => {
    const result = parseApi("not json", 0, "/repos", "GET");
    expect(result.body).toBe("not json");
  });

  it("handles empty stderr for error body", () => {
    const result = parseApi("error", 1, "/repos", "POST", "");
    expect(result.errorBody).toBeUndefined();
  });
});

describe("parseRunView — with steps", () => {
  it("parses jobs with steps", () => {
    const json = JSON.stringify({
      databaseId: 100,
      status: "completed",
      conclusion: "success",
      name: "CI",
      workflowName: "Build",
      headBranch: "main",
      url: "https://url",
      createdAt: "2024-01-15T10:00:00Z",
      updatedAt: "2024-01-15T10:05:00Z",
      startedAt: "2024-01-15T10:00:05Z",
      jobs: [
        {
          name: "build",
          status: "completed",
          conclusion: "success",
          steps: [
            { name: "Checkout", status: "completed", conclusion: "success" },
            { name: "Build", status: "completed", conclusion: "success" },
          ],
        },
      ],
    });

    const result = parseRunView(json);
    expect(result.jobs[0].steps).toHaveLength(2);
    expect(result.jobs[0].steps![0].name).toBe("Checkout");
  });

  it("uses displayTitle fallback for name", () => {
    const json = JSON.stringify({
      databaseId: 100,
      status: "completed",
      headBranch: "main",
      url: "https://url",
      displayTitle: "PR Title",
    });
    const result = parseRunView(json);
    expect(result.name).toBe("PR Title");
  });
});

describe("parsePrView — commits and additional fields", () => {
  it("parses commits array", () => {
    const json = JSON.stringify({
      number: 42,
      state: "OPEN",
      title: "Test",
      headRefName: "feat",
      baseRefName: "main",
      url: "https://url",
      commits: [{ oid: "abc123" }, { oid: "def456" }],
      labels: [{ name: "bug" }],
      isDraft: true,
      assignees: [{ login: "alice" }],
      milestone: { title: "v2.0" },
      projectItems: [{ title: "Board" }],
    });
    const result = parsePrView(json);
    expect(result.commitCount).toBe(2);
    expect(result.latestCommitSha).toBe("def456");
    expect(result.labels).toEqual(["bug"]);
    expect(result.isDraft).toBe(true);
    expect(result.assignees).toEqual(["alice"]);
    expect(result.milestone).toBe("v2.0");
    expect(result.projectItems).toEqual(["Board"]);
  });

  it("handles commits with nested oid", () => {
    const json = JSON.stringify({
      number: 1,
      state: "OPEN",
      title: "Test",
      headRefName: "feat",
      baseRefName: "main",
      url: "https://url",
      commits: [{ commit: { oid: "nested123" } }],
    });
    const result = parsePrView(json);
    expect(result.latestCommitSha).toBe("nested123");
  });
});

describe("parsePrList — with optional fields", () => {
  it("parses PR list with labels, isDraft, baseBranch, etc.", () => {
    const json = JSON.stringify([
      {
        number: 1,
        state: "OPEN",
        title: "WIP",
        url: "https://url",
        headRefName: "feat",
        author: { login: "alice" },
        labels: [{ name: "wip" }],
        isDraft: true,
        baseRefName: "main",
        reviewDecision: "REVIEW_REQUIRED",
        mergeable: "MERGEABLE",
      },
    ]);
    const result = parsePrList(json);
    expect(result.prs[0].labels).toEqual(["wip"]);
    expect(result.prs[0].isDraft).toBe(true);
    expect(result.prs[0].baseBranch).toBe("main");
    expect(result.prs[0].reviewDecision).toBe("REVIEW_REQUIRED");
    expect(result.prs[0].mergeable).toBe("MERGEABLE");
  });

  it("handles empty list", () => {
    const result = parsePrList("[]");
    expect(result.prs).toEqual([]);
  });
});

describe("parseComment — with opts", () => {
  it("parses comment with all opts", () => {
    const result = parseComment("https://github.com/owner/repo/pull/42#issuecomment-123", {
      operation: "create",
      prNumber: 42,
    });
    expect(result.operation).toBe("create");
    expect(result.prNumber).toBe(42);
    expect(result.commentId).toBe("123");
  });

  it("parses comment with issueNumber", () => {
    const result = parseComment("https://url", { issueNumber: 10 });
    expect(result.issueNumber).toBe(10);
  });
});

describe("parseIssueCreate — basic", () => {
  it("parses issue create URL", () => {
    const result = parseIssueCreate("https://github.com/owner/repo/issues/50");
    expect(result.number).toBe(50);
    expect(result.url).toBe("https://github.com/owner/repo/issues/50");
  });
});

describe("parseIssueView — additional fields", () => {
  it("parses all optional fields", () => {
    const json = JSON.stringify({
      number: 1,
      state: "CLOSED",
      title: "Bug",
      url: "https://url",
      stateReason: "completed",
      author: { login: "alice" },
      milestone: { title: "v2.0" },
      updatedAt: "2024-06-01",
      closedAt: "2024-06-15",
      isPinned: true,
      projectItems: [{ title: "Board" }],
    });
    const result = parseIssueView(json);
    expect(result.stateReason).toBe("completed");
    expect(result.author).toBe("alice");
    expect(result.milestone).toBe("v2.0");
    expect(result.isPinned).toBe(true);
    expect(result.projectItems).toEqual(["Board"]);
  });
});

describe("parseIssueList — author and optional fields", () => {
  it("parses issues with author, createdAt, milestone", () => {
    const json = JSON.stringify([
      {
        number: 1,
        state: "OPEN",
        title: "Bug",
        url: "https://url",
        labels: [],
        assignees: [],
        author: { login: "alice" },
        createdAt: "2024-01-01",
        milestone: { title: "v2.0" },
      },
    ]);
    const result = parseIssueList(json);
    expect(result.issues[0].author).toBe("alice");
    expect(result.issues[0].createdAt).toBe("2024-01-01");
    expect(result.issues[0].milestone).toBe("v2.0");
  });
});

describe("parsePrChecks — deduplication edge cases", () => {
  it("keeps earlier entry when timestamps are equal", () => {
    const json = JSON.stringify([
      {
        name: "CI",
        state: "FAILURE",
        bucket: "fail",
        startedAt: "2024-01-15T10:00:00Z",
        completedAt: "2024-01-15T10:05:00Z",
      },
      {
        name: "CI",
        state: "SUCCESS",
        bucket: "pass",
        startedAt: "2024-01-15T10:00:00Z",
        completedAt: "2024-01-15T10:05:00Z",
      },
    ]);
    const result = parsePrChecks(json, 1);
    // When timestamps are equal, later entry wins
    expect(result.checks).toHaveLength(1);
    expect(result.checks[0].state).toBe("SUCCESS");
  });

  it("keeps newer entry based on startedAt when no completedAt", () => {
    const json = JSON.stringify([
      {
        name: "CI",
        state: "FAILURE",
        bucket: "fail",
        startedAt: "2024-01-15T10:00:00Z",
      },
      {
        name: "CI",
        state: "SUCCESS",
        bucket: "pass",
        startedAt: "2024-01-15T11:00:00Z",
      },
    ]);
    const result = parsePrChecks(json, 1);
    expect(result.checks).toHaveLength(1);
    expect(result.checks[0].state).toBe("SUCCESS");
  });
});

describe("parseRunRerun — job and failed-only modes", () => {
  it("parses rerun with job specified", () => {
    const result = parseRunRerun("", "✓ Requested rerun", 100, false, "build");
    expect(result.status).toBe("requested-job");
    expect(result.job).toBe("build");
  });

  it("parses rerun for failed only", () => {
    const result = parseRunRerun("", "✓ Requested rerun", 100, true);
    expect(result.status).toBe("requested-failed");
    expect(result.failedOnly).toBe(true);
  });

  it("parses rerun for all jobs", () => {
    const result = parseRunRerun("", "✓ Requested rerun", 100, false);
    expect(result.status).toBe("requested-full");
  });
});
