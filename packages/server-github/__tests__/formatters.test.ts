import { describe, it, expect } from "vitest";
import {
  formatPrView,
  formatPrList,
  formatPrCreate,
  formatPrChecks,
  compactPrChecksMap,
  formatPrChecksCompact,
  formatComment,
  formatIssueView,
  formatIssueList,
  formatIssueCreate,
  formatRunView,
  formatRunList,
  compactPrViewMap,
  formatPrViewCompact,
  compactPrListMap,
  formatPrListCompact,
  compactIssueViewMap,
  formatIssueViewCompact,
  compactIssueListMap,
  formatIssueListCompact,
  compactRunViewMap,
  formatRunViewCompact,
  compactRunListMap,
  formatRunListCompact,
} from "../src/lib/formatters.js";
import type {
  PrViewResult,
  PrListResult,
  PrCreateResult,
  PrChecksResult,
  CommentResult,
  IssueViewResult,
  IssueListResult,
  IssueCreateResult,
  RunViewResult,
  RunListResult,
} from "../src/schemas/index.js";

// ── PR View ──────────────────────────────────────────────────────────

describe("formatPrView", () => {
  const data: PrViewResult = {
    number: 42,
    state: "OPEN",
    title: "Add feature",
    body: "Description here",
    mergeable: "MERGEABLE",
    reviewDecision: "APPROVED",
    checks: [{ name: "CI", status: "COMPLETED", conclusion: "SUCCESS" }],
    url: "https://github.com/owner/repo/pull/42",
    headBranch: "feat/add",
    baseBranch: "main",
    additions: 50,
    deletions: 10,
    changedFiles: 3,
  };

  it("formats PR view with all fields", () => {
    const output = formatPrView(data);
    expect(output).toContain("PR #42: Add feature (OPEN)");
    expect(output).toContain("feat/add → main");
    expect(output).toContain("mergeable: MERGEABLE");
    expect(output).toContain("+50 -10 (3 files)");
    expect(output).toContain("CI: COMPLETED (SUCCESS)");
  });

  it("includes body preview", () => {
    const output = formatPrView(data);
    expect(output).toContain("body: Description here");
  });

  it("truncates long body", () => {
    const longBody: PrViewResult = {
      ...data,
      body: "x".repeat(300),
    };
    const output = formatPrView(longBody);
    expect(output).toContain("...");
  });
});

describe("compactPrView", () => {
  it("maps to compact format", () => {
    const data: PrViewResult = {
      number: 1,
      state: "OPEN",
      title: "Test",
      body: "long body",
      mergeable: "MERGEABLE",
      reviewDecision: "APPROVED",
      checks: [{ name: "CI", status: "COMPLETED", conclusion: "SUCCESS" }],
      url: "https://github.com/owner/repo/pull/1",
      headBranch: "feat/test",
      baseBranch: "main",
      additions: 10,
      deletions: 5,
      changedFiles: 2,
    };
    const compact = compactPrViewMap(data);
    expect(compact.checksTotal).toBe(1);
    expect(compact).not.toHaveProperty("body");
    expect(compact).not.toHaveProperty("checks");

    const text = formatPrViewCompact(compact);
    expect(text).toContain("PR #1");
    expect(text).toContain("1 checks");
  });
});

// ── PR List ──────────────────────────────────────────────────────────

describe("formatPrList", () => {
  it("formats PR list", () => {
    const data: PrListResult = {
      prs: [
        {
          number: 1,
          state: "OPEN",
          title: "First",
          url: "https://url",
          headBranch: "feat/1",
          author: "alice",
        },
      ],
      total: 1,
    };
    const output = formatPrList(data);
    expect(output).toContain("1 pull requests:");
    expect(output).toContain("#1 First (OPEN)");
    expect(output).toContain("@alice");
  });

  it("formats empty list", () => {
    const data: PrListResult = { prs: [], total: 0 };
    expect(formatPrList(data)).toBe("No pull requests found.");
  });
});

describe("compactPrList", () => {
  it("maps to compact format", () => {
    const data: PrListResult = {
      prs: [
        { number: 1, state: "OPEN", title: "PR", url: "https://url", headBranch: "b", author: "a" },
      ],
      total: 1,
    };
    const compact = compactPrListMap(data);
    expect(compact.prs[0]).not.toHaveProperty("url");
    expect(compact.prs[0]).not.toHaveProperty("headBranch");

    const text = formatPrListCompact(compact);
    expect(text).toContain("1 PRs:");
  });
});

// ── PR Create ────────────────────────────────────────────────────────

describe("formatPrCreate", () => {
  it("formats PR create result", () => {
    const data: PrCreateResult = { number: 99, url: "https://github.com/owner/repo/pull/99" };
    expect(formatPrCreate(data)).toBe("Created PR #99: https://github.com/owner/repo/pull/99");
  });
});

// ── PR Checks ────────────────────────────────────────────────────────

describe("formatPrChecks", () => {
  const data: PrChecksResult = {
    pr: 42,
    checks: [
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
    ],
    summary: { total: 2, passed: 1, failed: 1, pending: 0, skipped: 0, cancelled: 0 },
  };

  it("formats PR checks with summary header", () => {
    const output = formatPrChecks(data);
    expect(output).toContain("PR #42: 2 checks (1 passed, 1 failed, 0 pending)");
  });

  it("formats individual checks with workflow", () => {
    const output = formatPrChecks(data);
    expect(output).toContain("CI / build: SUCCESS (pass) [CI]");
    expect(output).toContain("CI / test: FAILURE (fail) [CI]");
  });

  it("omits workflow tag when empty", () => {
    const noWorkflow: PrChecksResult = {
      pr: 1,
      checks: [
        {
          name: "check",
          state: "SUCCESS",
          bucket: "pass",
          description: "",
          event: "",
          workflow: "",
          link: "",
          startedAt: "",
          completedAt: "",
        },
      ],
      summary: { total: 1, passed: 1, failed: 0, pending: 0, skipped: 0, cancelled: 0 },
    };
    const output = formatPrChecks(noWorkflow);
    expect(output).toContain("check: SUCCESS (pass)");
    expect(output).not.toContain("[");
  });
});

describe("compactPrChecks", () => {
  it("maps to compact format", () => {
    const data: PrChecksResult = {
      pr: 42,
      checks: [
        {
          name: "CI / build",
          state: "SUCCESS",
          bucket: "pass",
          description: "",
          event: "",
          workflow: "CI",
          link: "",
          startedAt: "",
          completedAt: "",
        },
      ],
      summary: { total: 1, passed: 1, failed: 0, pending: 0, skipped: 0, cancelled: 0 },
    };
    const compact = compactPrChecksMap(data);
    expect(compact.pr).toBe(42);
    expect(compact.total).toBe(1);
    expect(compact.passed).toBe(1);
    expect(compact.failed).toBe(0);
    expect(compact.pending).toBe(0);
    expect(compact).not.toHaveProperty("checks");
    expect(compact).not.toHaveProperty("summary");

    const text = formatPrChecksCompact(compact);
    expect(text).toContain("PR #42");
    expect(text).toContain("1 checks");
    expect(text).toContain("1 passed");
  });
});

// ── Comment ──────────────────────────────────────────────────────────

describe("formatComment", () => {
  it("formats comment result for PR comment", () => {
    const data: CommentResult = {
      url: "https://github.com/owner/repo/pull/42#issuecomment-123456",
    };
    expect(formatComment(data)).toBe(
      "Comment added: https://github.com/owner/repo/pull/42#issuecomment-123456",
    );
  });

  it("formats comment result for issue comment", () => {
    const data: CommentResult = {
      url: "https://github.com/owner/repo/issues/15#issuecomment-789012",
    };
    expect(formatComment(data)).toBe(
      "Comment added: https://github.com/owner/repo/issues/15#issuecomment-789012",
    );
  });
});

// ── Issue View ───────────────────────────────────────────────────────

describe("formatIssueView", () => {
  it("formats issue view with all fields", () => {
    const data: IssueViewResult = {
      number: 15,
      state: "OPEN",
      title: "Bug report",
      body: "Steps to reproduce",
      labels: ["bug", "priority:high"],
      assignees: ["alice"],
      url: "https://github.com/owner/repo/issues/15",
      createdAt: "2024-01-15T10:00:00Z",
    };
    const output = formatIssueView(data);
    expect(output).toContain("Issue #15: Bug report (OPEN)");
    expect(output).toContain("labels: bug, priority:high");
    expect(output).toContain("assignees: alice");
  });

  it("omits empty labels and assignees", () => {
    const data: IssueViewResult = {
      number: 1,
      state: "CLOSED",
      title: "Done",
      body: null,
      labels: [],
      assignees: [],
      url: "https://url",
      createdAt: "2024-01-01T00:00:00Z",
    };
    const output = formatIssueView(data);
    expect(output).not.toContain("labels:");
    expect(output).not.toContain("assignees:");
    expect(output).not.toContain("body:");
  });
});

describe("compactIssueView", () => {
  it("maps to compact format", () => {
    const data: IssueViewResult = {
      number: 1,
      state: "OPEN",
      title: "Test",
      body: "long body text",
      labels: ["bug"],
      assignees: ["alice"],
      url: "https://url",
      createdAt: "2024-01-01T00:00:00Z",
    };
    const compact = compactIssueViewMap(data);
    expect(compact).not.toHaveProperty("body");

    const text = formatIssueViewCompact(compact);
    expect(text).toContain("Issue #1");
    expect(text).toContain("[bug]");
  });
});

// ── Issue List ───────────────────────────────────────────────────────

describe("formatIssueList", () => {
  it("formats issue list", () => {
    const data: IssueListResult = {
      issues: [
        {
          number: 1,
          state: "OPEN",
          title: "Bug",
          url: "https://url",
          labels: ["bug"],
          assignees: [],
        },
      ],
      total: 1,
    };
    const output = formatIssueList(data);
    expect(output).toContain("1 issues:");
    expect(output).toContain("#1 Bug (OPEN) [bug]");
  });

  it("formats empty list", () => {
    const data: IssueListResult = { issues: [], total: 0 };
    expect(formatIssueList(data)).toBe("No issues found.");
  });
});

describe("compactIssueList", () => {
  it("maps to compact format", () => {
    const data: IssueListResult = {
      issues: [
        {
          number: 1,
          state: "OPEN",
          title: "Bug",
          url: "https://url",
          labels: ["bug"],
          assignees: ["a"],
        },
      ],
      total: 1,
    };
    const compact = compactIssueListMap(data);
    expect(compact.issues[0]).not.toHaveProperty("url");
    expect(compact.issues[0]).not.toHaveProperty("labels");

    const text = formatIssueListCompact(compact);
    expect(text).toContain("1 issues:");
  });
});

// ── Issue Create ─────────────────────────────────────────────────────

describe("formatIssueCreate", () => {
  it("formats issue create result", () => {
    const data: IssueCreateResult = { number: 50, url: "https://github.com/owner/repo/issues/50" };
    expect(formatIssueCreate(data)).toBe(
      "Created issue #50: https://github.com/owner/repo/issues/50",
    );
  });
});

// ── Run View ─────────────────────────────────────────────────────────

describe("formatRunView", () => {
  it("formats run view with all fields", () => {
    const data: RunViewResult = {
      id: 12345,
      status: "completed",
      conclusion: "success",
      name: "CI",
      workflowName: "Build and Test",
      headBranch: "main",
      jobs: [
        { name: "build", status: "completed", conclusion: "success" },
        { name: "test", status: "completed", conclusion: "failure" },
      ],
      url: "https://github.com/owner/repo/actions/runs/12345",
      createdAt: "2024-01-15T10:00:00Z",
    };
    const output = formatRunView(data);
    expect(output).toContain("Run #12345: Build and Test / CI (completed)");
    expect(output).toContain("conclusion: success");
    expect(output).toContain("branch: main");
    expect(output).toContain("build: completed (success)");
    expect(output).toContain("test: completed (failure)");
  });

  it("formats run with pending conclusion", () => {
    const data: RunViewResult = {
      id: 1,
      status: "in_progress",
      conclusion: null,
      name: "CI",
      workflowName: "Build",
      headBranch: "feat/test",
      jobs: [],
      url: "https://url",
      createdAt: "2024-01-01T00:00:00Z",
    };
    const output = formatRunView(data);
    expect(output).toContain("conclusion: pending");
  });

  it("formats run with headSha, event, startedAt, and attempt", () => {
    const data: RunViewResult = {
      id: 999,
      status: "completed",
      conclusion: "success",
      name: "CI",
      workflowName: "Build",
      headBranch: "main",
      jobs: [],
      url: "https://url",
      createdAt: "2024-06-01T10:00:00Z",
      headSha: "abc123",
      event: "push",
      startedAt: "2024-06-01T10:00:05Z",
      attempt: 2,
    };
    const output = formatRunView(data);
    expect(output).toContain("sha: abc123");
    expect(output).toContain("event: push");
    expect(output).toContain("started: 2024-06-01T10:00:05Z");
    expect(output).toContain("attempt: 2");
  });
});

describe("compactRunView", () => {
  it("maps to compact format", () => {
    const data: RunViewResult = {
      id: 1,
      status: "completed",
      conclusion: "success",
      name: "CI",
      workflowName: "Build",
      headBranch: "main",
      jobs: [{ name: "build", status: "completed", conclusion: "success" }],
      url: "https://url",
      createdAt: "2024-01-01T00:00:00Z",
    };
    const compact = compactRunViewMap(data);
    expect(compact.jobsTotal).toBe(1);
    expect(compact).not.toHaveProperty("jobs");
    expect(compact).not.toHaveProperty("name");

    const text = formatRunViewCompact(compact);
    expect(text).toContain("Run #1");
    expect(text).toContain("1 jobs");
  });
});

// ── Run List ─────────────────────────────────────────────────────────

describe("formatRunList", () => {
  it("formats run list", () => {
    const data: RunListResult = {
      runs: [
        {
          id: 100,
          status: "completed",
          conclusion: "success",
          name: "CI",
          workflowName: "Build",
          headBranch: "main",
          url: "https://url",
          createdAt: "2024-01-01T00:00:00Z",
        },
      ],
      total: 1,
    };
    const output = formatRunList(data);
    expect(output).toContain("1 workflow runs:");
    expect(output).toContain("#100 Build / CI (completed → success) [main]");
  });

  it("formats empty list", () => {
    const data: RunListResult = { runs: [], total: 0 };
    expect(formatRunList(data)).toBe("No workflow runs found.");
  });
});

describe("compactRunList", () => {
  it("maps to compact format", () => {
    const data: RunListResult = {
      runs: [
        {
          id: 1,
          status: "completed",
          conclusion: "success",
          name: "CI",
          workflowName: "Build",
          headBranch: "main",
          url: "https://url",
          createdAt: "2024-01-01T00:00:00Z",
        },
      ],
      total: 1,
    };
    const compact = compactRunListMap(data);
    expect(compact.runs[0]).not.toHaveProperty("headBranch");
    expect(compact.runs[0]).not.toHaveProperty("url");

    const text = formatRunListCompact(compact);
    expect(text).toContain("1 runs:");
  });
});

// ── P1-gap #147: PR view with reviews ───────────────────────────────

describe("formatPrView — reviews (P1 #147)", () => {
  it("formats PR view with reviews", () => {
    const data: PrViewResult = {
      number: 42,
      state: "OPEN",
      title: "Add feature",
      body: null,
      mergeable: "MERGEABLE",
      reviewDecision: "APPROVED",
      checks: [],
      url: "https://github.com/owner/repo/pull/42",
      headBranch: "feat/add",
      baseBranch: "main",
      additions: 10,
      deletions: 5,
      changedFiles: 2,
      reviews: [
        { author: "alice", state: "APPROVED", body: "LGTM!", submittedAt: "2024-06-01T12:00:00Z" },
        {
          author: "bob",
          state: "CHANGES_REQUESTED",
          body: "Fix typo",
          submittedAt: "2024-06-01T13:00:00Z",
        },
      ],
    };
    const output = formatPrView(data);

    expect(output).toContain("reviews:");
    expect(output).toContain("@alice: APPROVED");
    expect(output).toContain("@bob: CHANGES_REQUESTED");
    expect(output).toContain("LGTM!");
    expect(output).toContain("Fix typo");
  });

  it("omits reviews section when no reviews", () => {
    const data: PrViewResult = {
      number: 1,
      state: "OPEN",
      title: "No reviews",
      body: null,
      mergeable: "MERGEABLE",
      reviewDecision: "",
      checks: [],
      url: "https://url",
      headBranch: "feat/test",
      baseBranch: "main",
      additions: 0,
      deletions: 0,
      changedFiles: 0,
    };
    const output = formatPrView(data);
    expect(output).not.toContain("reviews:");
  });
});

// ── P1-gap #148: Run list expanded fields ───────────────────────────

describe("formatRunList — expanded fields (P1 #148)", () => {
  it("formats run list with headSha and event", () => {
    const data: RunListResult = {
      runs: [
        {
          id: 100,
          status: "completed",
          conclusion: "success",
          name: "Build",
          workflowName: "CI",
          headBranch: "main",
          url: "https://url",
          createdAt: "2024-01-01T00:00:00Z",
          headSha: "abc123def456789012345678901234567890abcd",
          event: "push",
          startedAt: "2024-01-01T00:00:05Z",
          attempt: 1,
        },
      ],
      total: 1,
    };
    const output = formatRunList(data);

    expect(output).toContain("abc123d");
    expect(output).toContain("(push)");
  });
});

// ── P1-gap #149: Run rerun attempt tracking ─────────────────────────

import { formatRunRerun } from "../src/lib/formatters.js";
import type { RunRerunResult } from "../src/schemas/index.js";

describe("formatRunRerun — attempt tracking (P1 #149)", () => {
  it("formats rerun with attempt number", () => {
    const data: RunRerunResult = {
      runId: 12345,
      status: "requested",
      failedOnly: false,
      url: "https://github.com/owner/repo/actions/runs/12345",
      attempt: 3,
    };
    const output = formatRunRerun(data);

    expect(output).toContain("attempt #3");
  });

  it("formats rerun with new run URL", () => {
    const data: RunRerunResult = {
      runId: 12345,
      status: "requested",
      failedOnly: false,
      url: "https://github.com/owner/repo/actions/runs/12345",
      newRunUrl: "https://github.com/owner/repo/actions/runs/12346",
    };
    const output = formatRunRerun(data);

    expect(output).toContain("https://github.com/owner/repo/actions/runs/12346");
  });

  it("formats rerun without attempt info", () => {
    const data: RunRerunResult = {
      runId: 12345,
      status: "requested",
      failedOnly: false,
      url: "https://github.com/owner/repo/actions/runs/12345",
    };
    const output = formatRunRerun(data);

    expect(output).not.toContain("attempt");
    expect(output).toContain("Rerun requested for run #12345");
  });
});
