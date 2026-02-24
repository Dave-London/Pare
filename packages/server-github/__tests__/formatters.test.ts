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
    expect(compact).toHaveProperty("checks");
    expect(compact).toHaveProperty("summary");

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

import {
  formatRunRerun,
  formatLabelList,
  formatLabelCreate,
  formatPrMerge,
  formatPrReview,
  formatPrUpdate,
  formatPrDiff,
  formatIssueClose,
  formatIssueUpdate,
  formatGistCreate,
  formatReleaseCreate,
  formatReleaseList,
  formatRunViewLog,
  formatRepoView,
  formatRepoClone,
  formatDiscussionList,
  compactReleaseListMap,
  formatReleaseListCompact,
  compactRepoViewMap,
  formatRepoViewCompact,
  compactDiscussionListMap,
  formatDiscussionListCompact,
  compactPrDiffMap,
  formatPrDiffCompact,
  compactPrChecksMap,
  formatApi,
} from "../src/lib/formatters.js";
import type {
  RunRerunResult,
  LabelListResult,
  LabelCreateResult,
  PrMergeResult,
  PrReviewResult,
  EditResult,
  PrDiffResult,
  IssueCloseResult,
  GistCreateResult,
  ReleaseCreateResult,
  ReleaseListResult,
  RepoViewResult,
  RepoCloneResult,
  DiscussionListResult,
  ApiResult,
} from "../src/schemas/index.js";

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

// ── Label List ──────────────────────────────────────────────────────

describe("formatLabelList", () => {
  it("formats label list with all fields", () => {
    const data: LabelListResult = {
      labels: [
        { name: "bug", description: "Something isn't working", color: "d73a4a", isDefault: true },
        { name: "feature", description: "", color: "a2eeef", isDefault: false },
      ],
      total: 2,
    };
    const output = formatLabelList(data);

    expect(output).toContain("2 labels:");
    expect(output).toContain("bug #d73a4a (default)");
    expect(output).toContain("Something isn't working");
    expect(output).toContain("feature #a2eeef");
    expect(output).not.toContain("feature #a2eeef (default)");
  });

  it("formats empty label list", () => {
    const data: LabelListResult = { labels: [], total: 0 };
    expect(formatLabelList(data)).toBe("No labels found.");
  });
});

// ── Label Create ────────────────────────────────────────────────────

describe("formatLabelCreate", () => {
  it("formats label create result", () => {
    const data: LabelCreateResult = {
      name: "my-label",
      description: "A test label",
      color: "ff0000",
    };
    const output = formatLabelCreate(data);
    expect(output).toBe('Created label "my-label" #ff0000 — A test label');
  });

  it("formats label create without optional fields", () => {
    const data: LabelCreateResult = { name: "simple" };
    expect(formatLabelCreate(data)).toBe('Created label "simple"');
  });

  it("formats label create with error", () => {
    const data: LabelCreateResult = {
      name: "dup",
      errorType: "already-exists",
      errorMessage: 'Label "dup" already exists',
    };
    const output = formatLabelCreate(data);
    expect(output).toContain("[error: already-exists]");
  });
});

// ── PR Merge ──────────────────────────────────────────────────────────

describe("formatPrMerge", () => {
  it("formats standard merge", () => {
    const data: PrMergeResult = {
      number: 42,
      merged: true,
      method: "merge",
      url: "https://github.com/owner/repo/pull/42",
      state: "merged",
    };
    expect(formatPrMerge(data)).toContain("Merged PR #42 via merge");
  });

  it("formats merge with branch deleted", () => {
    const data: PrMergeResult = {
      number: 42,
      merged: true,
      method: "squash",
      url: "https://github.com/owner/repo/pull/42",
      state: "merged",
      branchDeleted: true,
    };
    expect(formatPrMerge(data)).toContain("(branch deleted)");
  });

  it("formats merge with branch kept", () => {
    const data: PrMergeResult = {
      number: 42,
      merged: true,
      method: "merge",
      url: "https://github.com/owner/repo/pull/42",
      state: "merged",
      branchDeleted: false,
    };
    expect(formatPrMerge(data)).toContain("(branch kept)");
  });

  it("formats merge with SHA", () => {
    const data: PrMergeResult = {
      number: 42,
      merged: true,
      method: "merge",
      url: "https://github.com/owner/repo/pull/42",
      state: "merged",
      mergeCommitSha: "abcdef1234567890abcdef1234567890abcdef12",
    };
    expect(formatPrMerge(data)).toContain("[abcdef1]");
  });

  it("formats auto-merge enabled", () => {
    const data: PrMergeResult = {
      number: 42,
      merged: false,
      method: "squash",
      url: "https://github.com/owner/repo/pull/42",
      state: "auto-merge-enabled",
    };
    expect(formatPrMerge(data)).toContain("Auto-merge enabled");
  });

  it("formats auto-merge disabled", () => {
    const data: PrMergeResult = {
      number: 42,
      merged: false,
      method: "merge",
      url: "https://github.com/owner/repo/pull/42",
      state: "auto-merge-disabled",
    };
    expect(formatPrMerge(data)).toContain("Auto-merge disabled");
  });
});

// ── PR Review ─────────────────────────────────────────────────────────

describe("formatPrReview", () => {
  it("formats review without error", () => {
    const data: PrReviewResult = {
      number: 10,
      event: "APPROVE",
      url: "https://github.com/owner/repo/pull/10",
    };
    expect(formatPrReview(data)).toBe(
      "Reviewed PR #10 (APPROVE): https://github.com/owner/repo/pull/10",
    );
  });

  it("formats review with error", () => {
    const data: PrReviewResult = {
      number: 10,
      event: "APPROVE",
      url: "https://github.com/owner/repo/pull/10",
      errorType: "not-found",
    };
    expect(formatPrReview(data)).toContain("[error: not-found]");
  });
});

// ── PR Update / Issue Update ──────────────────────────────────────────

describe("formatPrUpdate", () => {
  it("formats PR update", () => {
    const data: EditResult = { number: 5, url: "https://github.com/owner/repo/pull/5" };
    expect(formatPrUpdate(data)).toBe("Updated PR #5: https://github.com/owner/repo/pull/5");
  });
});

describe("formatIssueUpdate", () => {
  it("formats issue update", () => {
    const data: EditResult = { number: 15, url: "https://github.com/owner/repo/issues/15" };
    expect(formatIssueUpdate(data)).toBe(
      "Updated issue #15: https://github.com/owner/repo/issues/15",
    );
  });
});

// ── Issue Close ───────────────────────────────────────────────────────

describe("formatIssueClose", () => {
  it("formats basic close", () => {
    const data: IssueCloseResult = {
      number: 10,
      state: "closed",
      url: "https://github.com/owner/repo/issues/10",
    };
    expect(formatIssueClose(data)).toContain("Closed issue #10");
  });

  it("formats close with reason", () => {
    const data: IssueCloseResult = {
      number: 10,
      state: "closed",
      url: "https://github.com/owner/repo/issues/10",
      reason: "not planned",
    };
    expect(formatIssueClose(data)).toContain("(not planned)");
  });

  it("formats close with alreadyClosed", () => {
    const data: IssueCloseResult = {
      number: 10,
      state: "closed",
      url: "https://github.com/owner/repo/issues/10",
      alreadyClosed: true,
    };
    expect(formatIssueClose(data)).toContain("[already closed]");
  });
});

// ── Issue Create with labels ──────────────────────────────────────────

describe("formatIssueCreate — with labels", () => {
  it("formats issue create with labels", () => {
    const data: IssueCreateResult = {
      number: 50,
      url: "https://github.com/owner/repo/issues/50",
      labelsApplied: ["bug", "urgent"],
    };
    expect(formatIssueCreate(data)).toContain("[bug, urgent]");
  });
});

// ── PR Diff ───────────────────────────────────────────────────────────

describe("formatPrDiff", () => {
  it("formats diff with binary file", () => {
    const data: PrDiffResult = {
      files: [
        { file: "image.png", status: "added", additions: 0, deletions: 0, binary: true },
        { file: "readme.md", status: "modified", additions: 5, deletions: 2 },
      ],
      totalAdditions: 5,
      totalDeletions: 2,
      totalFiles: 2,
    };
    const output = formatPrDiff(data);
    expect(output).toContain("(binary)");
    expect(output).toContain("2 files changed");
  });

  it("formats truncated diff", () => {
    const data: PrDiffResult = {
      files: [{ file: "a.ts", status: "modified", additions: 10, deletions: 5 }],
      totalAdditions: 10,
      totalDeletions: 5,
      totalFiles: 1,
      truncated: true,
    };
    expect(formatPrDiff(data)).toContain("(truncated)");
  });
});

describe("compactPrDiff", () => {
  it("maps to compact format", () => {
    const data: PrDiffResult = {
      files: [{ file: "a.ts", status: "modified", additions: 10, deletions: 5 }],
      totalAdditions: 10,
      totalDeletions: 5,
      totalFiles: 1,
    };
    const compact = compactPrDiffMap(data);
    expect(compact.totalFiles).toBe(1);
    expect(formatPrDiffCompact(compact)).toContain("1 files changed");
  });
});

// ── Run View — jobs with steps ────────────────────────────────────────

describe("formatRunView — jobs with steps", () => {
  it("renders job steps", () => {
    const data: RunViewResult = {
      id: 1,
      status: "completed",
      conclusion: "success",
      name: "CI",
      workflowName: "Build",
      headBranch: "main",
      jobs: [
        {
          name: "build",
          status: "completed",
          conclusion: "success",
          steps: [
            { name: "Checkout", status: "completed", conclusion: "success" },
            { name: "Install", status: "completed", conclusion: "success" },
          ],
        },
      ],
      url: "https://url",
      createdAt: "2024-01-01T00:00:00Z",
    };
    const output = formatRunView(data);
    expect(output).toContain("Checkout: completed (success)");
    expect(output).toContain("Install: completed (success)");
  });
});

// ── Run Rerun — additional branches ──────────────────────────────────

describe("formatRunRerun — edge cases", () => {
  it("formats rerun for failed jobs only", () => {
    const data: RunRerunResult = {
      runId: 100,
      status: "requested",
      failedOnly: true,
      url: "https://url",
    };
    expect(formatRunRerun(data)).toContain("failed jobs only");
  });

  it("formats rerun for specific job", () => {
    const data: RunRerunResult = {
      runId: 100,
      status: "requested",
      failedOnly: false,
      url: "https://url",
      job: "build",
    };
    expect(formatRunRerun(data)).toContain("job build");
  });

  it("formats rerun without URL", () => {
    const data: RunRerunResult = {
      runId: 100,
      status: "requested",
      failedOnly: false,
      url: "",
    };
    expect(formatRunRerun(data)).not.toContain(":");
  });
});

// ── Gist Create ──────────────────────────────────────────────────────

describe("formatGistCreate", () => {
  it("formats public gist with files and description", () => {
    const data: GistCreateResult = {
      id: "abc123",
      url: "https://gist.github.com/abc123",
      public: true,
      files: ["file1.txt", "file2.txt"],
      description: "My gist",
    };
    const output = formatGistCreate(data);
    expect(output).toContain("public gist");
    expect(output).toContain("(file1.txt, file2.txt)");
    expect(output).toContain("My gist");
  });

  it("formats secret gist without files or description", () => {
    const data: GistCreateResult = {
      id: "def456",
      url: "https://gist.github.com/def456",
      public: false,
    };
    const output = formatGistCreate(data);
    expect(output).toContain("secret gist");
    expect(output).not.toContain("(");
  });
});

// ── Release Create ───────────────────────────────────────────────────

describe("formatReleaseCreate", () => {
  it("formats draft prerelease with assets", () => {
    const data: ReleaseCreateResult = {
      tag: "v1.0.0-beta",
      url: "https://github.com/owner/repo/releases/tag/v1.0.0-beta",
      draft: true,
      prerelease: true,
      assetsUploaded: 3,
    };
    const output = formatReleaseCreate(data);
    expect(output).toContain("(draft, prerelease)");
    expect(output).toContain("3 assets uploaded");
  });

  it("formats release without flags or assets", () => {
    const data: ReleaseCreateResult = {
      tag: "v1.0.0",
      url: "https://github.com/owner/repo/releases/tag/v1.0.0",
      draft: false,
      prerelease: false,
    };
    const output = formatReleaseCreate(data);
    expect(output).not.toContain("(");
    expect(output).not.toContain("assets");
  });
});

// ── Release List ─────────────────────────────────────────────────────

describe("formatReleaseList", () => {
  it("formats release list with flags", () => {
    const data: ReleaseListResult = {
      releases: [
        {
          tag: "v2.0.0",
          name: "Release 2",
          draft: false,
          prerelease: false,
          publishedAt: "2024-01-15",
          url: "https://url",
          isLatest: true,
        },
        {
          tag: "v1.0.0-rc1",
          name: "RC1",
          draft: true,
          prerelease: true,
          publishedAt: "2024-01-10",
          url: "https://url",
        },
      ],
      total: 2,
    };
    const output = formatReleaseList(data);
    expect(output).toContain("(latest)");
    expect(output).toContain("(draft, prerelease)");
  });

  it("formats empty release list", () => {
    const data: ReleaseListResult = { releases: [], total: 0 };
    expect(formatReleaseList(data)).toBe("No releases found.");
  });
});

describe("compactReleaseList", () => {
  it("maps to compact format", () => {
    const data: ReleaseListResult = {
      releases: [
        {
          tag: "v1.0.0",
          name: "R1",
          draft: false,
          prerelease: false,
          publishedAt: "2024-01-01",
          url: "https://url",
        },
      ],
      total: 1,
    };
    const compact = compactReleaseListMap(data);
    expect(compact.releases[0]).not.toHaveProperty("publishedAt");
    const text = formatReleaseListCompact(compact);
    expect(text).toContain("1 releases:");
    expect(text).toContain("v1.0.0 R1");
  });

  it("formats empty compact release list", () => {
    const compact = { releases: [], total: 0 };
    expect(formatReleaseListCompact(compact)).toBe("No releases found.");
  });

  it("formats compact release with flags", () => {
    const compact = {
      releases: [{ tag: "v1.0.0-rc", name: "RC", draft: true, prerelease: true }],
      total: 1,
    };
    expect(formatReleaseListCompact(compact)).toContain("(draft, prerelease)");
  });
});

// ── Run View Log ─────────────────────────────────────────────────────

describe("formatRunViewLog", () => {
  it("formats run with short logs", () => {
    const data: RunViewResult = {
      id: 1,
      status: "completed",
      conclusion: "success",
      name: "CI",
      workflowName: "Build",
      headBranch: "main",
      jobs: [],
      url: "https://url",
      createdAt: "2024-01-01T00:00:00Z",
      logs: "Build succeeded\nAll tests passed",
    };
    const output = formatRunViewLog(data);
    expect(output).toContain("Run #1: Build (completed)");
    expect(output).toContain("Build succeeded");
  });

  it("truncates long logs", () => {
    const data: RunViewResult = {
      id: 1,
      status: "completed",
      conclusion: "success",
      name: "CI",
      workflowName: "Build",
      headBranch: "main",
      jobs: [],
      url: "https://url",
      createdAt: "2024-01-01T00:00:00Z",
      logs: "x".repeat(3000),
    };
    const output = formatRunViewLog(data);
    expect(output).toContain("(truncated)");
  });

  it("handles no logs", () => {
    const data: RunViewResult = {
      id: 1,
      status: "completed",
      conclusion: "success",
      name: "CI",
      workflowName: "Build",
      headBranch: "main",
      jobs: [],
      url: "https://url",
      createdAt: "2024-01-01T00:00:00Z",
    };
    const output = formatRunViewLog(data);
    expect(output).toContain("Run #1");
  });
});

// ── Repo View ────────────────────────────────────────────────────────

describe("formatRepoView", () => {
  it("formats repo with all optional fields", () => {
    const data: RepoViewResult = {
      name: "repo",
      owner: "owner",
      description: "A great repo",
      url: "https://github.com/owner/repo",
      defaultBranch: "main",
      isPrivate: true,
      isArchived: true,
      isFork: true,
      stars: 100,
      forks: 20,
      languages: ["TypeScript", "JavaScript"],
      topics: ["cli", "tools"],
      license: "MIT",
      homepageUrl: "https://example.com",
      createdAt: "2024-01-01T00:00:00Z",
      pushedAt: "2024-06-01T00:00:00Z",
    };
    const output = formatRepoView(data);
    expect(output).toContain("(private)");
    expect(output).toContain("archived: true");
    expect(output).toContain("fork: true");
    expect(output).toContain("languages: TypeScript, JavaScript");
    expect(output).toContain("topics: cli, tools");
    expect(output).toContain("license: MIT");
    expect(output).toContain("homepage: https://example.com");
    expect(output).toContain("created: 2024-01-01T00:00:00Z");
    expect(output).toContain("pushed: 2024-06-01T00:00:00Z");
  });

  it("formats public repo with no description", () => {
    const data: RepoViewResult = {
      name: "repo",
      owner: "owner",
      description: null,
      url: "https://github.com/owner/repo",
      defaultBranch: "main",
      isPrivate: false,
      isArchived: false,
      isFork: false,
      stars: 0,
      forks: 0,
    };
    const output = formatRepoView(data);
    expect(output).toContain("(no description)");
    expect(output).not.toContain("(private)");
    expect(output).not.toContain("archived");
  });
});

describe("compactRepoView", () => {
  it("maps to compact format", () => {
    const data: RepoViewResult = {
      name: "repo",
      owner: "owner",
      description: "desc",
      url: "https://github.com/owner/repo",
      defaultBranch: "main",
      isPrivate: false,
      isArchived: false,
      isFork: false,
      stars: 50,
      forks: 10,
    };
    const compact = compactRepoViewMap(data);
    expect(compact).not.toHaveProperty("description");
    const text = formatRepoViewCompact(compact);
    expect(text).toContain("owner/repo");
    expect(text).toContain("50 stars");
  });

  it("formats private repo compact", () => {
    const data: RepoViewResult = {
      name: "secret",
      owner: "org",
      description: null,
      url: "https://url",
      defaultBranch: "main",
      isPrivate: true,
      isArchived: false,
      isFork: false,
      stars: 0,
      forks: 0,
    };
    const compact = compactRepoViewMap(data);
    expect(formatRepoViewCompact(compact)).toContain("(private)");
  });
});

// ── Repo Clone ───────────────────────────────────────────────────────

describe("formatRepoClone", () => {
  it("formats successful clone", () => {
    const data: RepoCloneResult = {
      success: true,
      repo: "owner/repo",
      directory: "/tmp/repo",
      message: "Cloned successfully",
    };
    expect(formatRepoClone(data)).toContain("Cloned owner/repo into /tmp/repo");
  });

  it("formats clone without directory", () => {
    const data: RepoCloneResult = {
      success: true,
      repo: "owner/repo",
      message: "Cloned",
    };
    expect(formatRepoClone(data)).toBe("Cloned owner/repo");
  });

  it("formats failed clone", () => {
    const data: RepoCloneResult = {
      success: false,
      repo: "owner/private-repo",
      message: "Permission denied",
      errorType: "permission-denied",
    };
    const output = formatRepoClone(data);
    expect(output).toContain("Clone failed");
    expect(output).toContain("[permission-denied]");
  });

  it("formats failed clone without errorType", () => {
    const data: RepoCloneResult = {
      success: false,
      repo: "owner/repo",
      message: "Not found",
    };
    expect(formatRepoClone(data)).toContain("Clone failed for owner/repo: Not found");
  });
});

// ── Discussion List ──────────────────────────────────────────────────

describe("formatDiscussionList", () => {
  it("formats discussion list with all fields", () => {
    const data: DiscussionListResult = {
      discussions: [
        {
          number: 1,
          title: "Help needed",
          author: "alice",
          category: "Q&A",
          createdAt: "2024-01-01",
          url: "https://url",
          isAnswered: true,
          comments: 5,
        },
        {
          number: 2,
          title: "Feature idea",
          author: "bob",
          category: "Ideas",
          createdAt: "2024-01-02",
          url: "https://url",
          isAnswered: false,
          comments: 0,
        },
      ],
      totalCount: 2,
    };
    const output = formatDiscussionList(data);
    expect(output).toContain("2 discussions:");
    expect(output).toContain("(answered)");
    expect(output).toContain("[5 comments]");
    expect(output).toContain("@alice");
    expect(output).not.toContain("#2 Feature idea [Ideas] @bob (answered)");
  });

  it("formats empty discussion list", () => {
    const data: DiscussionListResult = { discussions: [], totalCount: 0 };
    expect(formatDiscussionList(data)).toBe("No discussions found.");
  });
});

describe("compactDiscussionList", () => {
  it("maps to compact format", () => {
    const data: DiscussionListResult = {
      discussions: [
        {
          number: 1,
          title: "Q",
          author: "a",
          category: "Q&A",
          createdAt: "",
          url: "",
          isAnswered: true,
          comments: 3,
        },
      ],
      totalCount: 1,
    };
    const compact = compactDiscussionListMap(data);
    expect(compact.discussions[0]).not.toHaveProperty("author");
    const text = formatDiscussionListCompact(compact);
    expect(text).toContain("(answered)");
  });

  it("formats empty compact discussion list", () => {
    const compact = { discussions: [], totalCount: 0 };
    expect(formatDiscussionListCompact(compact)).toBe("No discussions found.");
  });
});

// ── PR View — additional branches ────────────────────────────────────

describe("formatPrView — additional optional fields", () => {
  it("shows author, isDraft, labels, assignees, milestone, timestamps", () => {
    const data: PrViewResult = {
      number: 1,
      state: "OPEN",
      title: "Test",
      body: null,
      mergeable: "MERGEABLE",
      reviewDecision: "",
      checks: [],
      url: "https://url",
      headBranch: "feat",
      baseBranch: "main",
      additions: 0,
      deletions: 0,
      changedFiles: 0,
      author: "alice",
      isDraft: true,
      labels: ["bug", "priority"],
      assignees: ["bob", "carol"],
      milestone: "v2.0",
      createdAt: "2024-01-01T00:00:00Z",
      updatedAt: "2024-06-01T00:00:00Z",
    };
    const output = formatPrView(data);
    expect(output).toContain("author: @alice");
    expect(output).toContain("draft: true");
    expect(output).toContain("labels: bug, priority");
    expect(output).toContain("assignees: bob, carol");
    expect(output).toContain("milestone: v2.0");
    expect(output).toContain("created: 2024-01-01T00:00:00Z");
    expect(output).toContain("updated: 2024-06-01T00:00:00Z");
  });

  it("truncates long review body", () => {
    const data: PrViewResult = {
      number: 1,
      state: "OPEN",
      title: "Test",
      body: null,
      mergeable: "MERGEABLE",
      reviewDecision: "APPROVED",
      checks: [],
      url: "https://url",
      headBranch: "feat",
      baseBranch: "main",
      additions: 0,
      deletions: 0,
      changedFiles: 0,
      reviews: [{ author: "reviewer", state: "COMMENTED", body: "x".repeat(100) }],
    };
    const output = formatPrView(data);
    expect(output).toContain("...");
  });

  it("shows review without body", () => {
    const data: PrViewResult = {
      number: 1,
      state: "OPEN",
      title: "Test",
      body: null,
      mergeable: "MERGEABLE",
      reviewDecision: "",
      checks: [],
      url: "https://url",
      headBranch: "feat",
      baseBranch: "main",
      additions: 0,
      deletions: 0,
      changedFiles: 0,
      reviews: [{ author: "reviewer", state: "APPROVED" }],
    };
    const output = formatPrView(data);
    expect(output).toContain("@reviewer: APPROVED");
  });
});

// ── PR Checks — no summary fallback ──────────────────────────────────

describe("formatPrChecks — no summary", () => {
  it("provides default summary when missing", () => {
    const data: PrChecksResult = {
      pr: 1,
      checks: [],
    };
    const output = formatPrChecks(data);
    expect(output).toContain("0 checks");
  });
});

describe("compactPrChecks — with errors", () => {
  it("includes error fields when present", () => {
    const data: PrChecksResult = {
      pr: 1,
      checks: [],
      errorType: "no-checks",
      errorMessage: "No checks found",
    };
    const compact = compactPrChecksMap(data);
    expect(compact).toHaveProperty("errorType", "no-checks");
    expect(compact).toHaveProperty("errorMessage", "No checks found");
  });
});

// ── Comment — operation and id ───────────────────────────────────────

describe("formatComment — additional branches", () => {
  it("formats edit comment with id", () => {
    const data: CommentResult = {
      url: "https://url",
      operation: "edit",
      commentId: "12345",
    };
    expect(formatComment(data)).toContain("editd (id: 12345)");
  });

  it("formats delete comment", () => {
    const data: CommentResult = {
      url: "https://url",
      operation: "delete",
    };
    expect(formatComment(data)).toContain("deleted");
  });
});

// ── Issue List — author field ────────────────────────────────────────

describe("formatIssueList — with author", () => {
  it("shows author when present", () => {
    const data: IssueListResult = {
      issues: [
        {
          number: 1,
          state: "OPEN",
          title: "Bug",
          url: "https://url",
          labels: [],
          assignees: [],
          author: "alice",
        },
      ],
      total: 1,
    };
    expect(formatIssueList(data)).toContain("@alice");
  });
});

// ── Issue View — additional fields ───────────────────────────────────

describe("formatIssueView — additional fields", () => {
  it("shows all optional fields", () => {
    const data: IssueViewResult = {
      number: 1,
      state: "CLOSED",
      title: "Bug",
      body: null,
      labels: [],
      assignees: [],
      url: "https://url",
      createdAt: "2024-01-01",
      author: "alice",
      stateReason: "completed",
      milestone: "v2.0",
      updatedAt: "2024-06-01",
      closedAt: "2024-06-15",
      isPinned: true,
    };
    const output = formatIssueView(data);
    expect(output).toContain("author: @alice");
    expect(output).toContain("reason: completed");
    expect(output).toContain("milestone: v2.0");
    expect(output).toContain("updated: 2024-06-01");
    expect(output).toContain("closed: 2024-06-15");
    expect(output).toContain("pinned: true");
  });
});

// ── PR List — additional fields ──────────────────────────────────────

describe("formatPrList — additional fields", () => {
  it("shows labels and draft status", () => {
    const data: PrListResult = {
      prs: [
        {
          number: 1,
          state: "OPEN",
          title: "WIP",
          url: "https://url",
          headBranch: "feat",
          author: "alice",
          labels: ["wip"],
          isDraft: true,
        },
      ],
      total: 1,
    };
    const output = formatPrList(data);
    expect(output).toContain("{wip}");
    expect(output).toContain("(draft)");
  });
});

// ── Run List — sha and event ─────────────────────────────────────────

describe("formatRunList — no conclusion/sha/event", () => {
  it("handles run without conclusion or sha", () => {
    const data: RunListResult = {
      runs: [
        {
          id: 1,
          status: "in_progress",
          conclusion: null,
          name: "CI",
          workflowName: "Build",
          headBranch: "main",
          url: "https://url",
          createdAt: "2024-01-01",
        },
      ],
      total: 1,
    };
    const output = formatRunList(data);
    expect(output).not.toContain("→");
    expect(output).toContain("(in_progress)");
  });
});

// ── API formatter ────────────────────────────────────────────────────

describe("formatApi", () => {
  it("formats API response with JSON body", () => {
    const data: ApiResult = {
      status: 200,
      statusCode: 200,
      body: { message: "ok" },
      endpoint: "/repos/owner/repo",
      method: "GET",
    };
    const output = formatApi(data);
    expect(output).toContain("GET /repos/owner/repo → 200");
    expect(output).toContain('"message"');
  });

  it("formats API response with string body", () => {
    const data: ApiResult = {
      status: 200,
      statusCode: 200,
      body: "plain text response",
      endpoint: "/repos",
      method: "GET",
    };
    expect(formatApi(data)).toContain("plain text response");
  });

  it("truncates long body", () => {
    const data: ApiResult = {
      status: 200,
      statusCode: 200,
      body: "x".repeat(600),
      endpoint: "/repos",
      method: "GET",
    };
    expect(formatApi(data)).toContain("...");
  });

  it("includes error body when present", () => {
    const data: ApiResult = {
      status: 422,
      statusCode: 422,
      body: "error",
      endpoint: "/repos",
      method: "POST",
      errorBody: "Validation failed",
    };
    expect(formatApi(data)).toContain("Error: Validation failed");
  });

  it("includes JSON error body", () => {
    const data: ApiResult = {
      status: 422,
      statusCode: 422,
      body: "error",
      endpoint: "/repos",
      method: "POST",
      errorBody: { message: "Bad request" },
    };
    expect(formatApi(data)).toContain("Bad request");
  });
});
