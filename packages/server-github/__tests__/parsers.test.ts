import { describe, it, expect } from "vitest";
import {
  parsePrView,
  parsePrList,
  parsePrCreate,
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
    expect(result.url).toBe("");
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
