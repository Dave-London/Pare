/**
 * Smoke tests: github run-list, run-rerun, run-view, release-create, release-list
 * Phase 2 (mocked)
 *
 * 84 scenarios total:
 *   run-list (21), run-rerun (11), run-view (15),
 *   release-create (25), release-list (12)
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  RunListResultSchema,
  RunRerunResultSchema,
  RunViewResultSchema,
  ReleaseCreateResultSchema,
  ReleaseListResultSchema,
} from "../../../packages/server-github/src/schemas/index.js";

vi.mock("../../../packages/server-github/src/lib/gh-runner.js", () => ({
  ghCmd: vi.fn(),
}));

import { ghCmd } from "../../../packages/server-github/src/lib/gh-runner.js";
import { registerRunListTool } from "../../../packages/server-github/src/tools/run-list.js";
import { registerRunRerunTool } from "../../../packages/server-github/src/tools/run-rerun.js";
import { registerRunViewTool } from "../../../packages/server-github/src/tools/run-view.js";
import { registerReleaseCreateTool } from "../../../packages/server-github/src/tools/release-create.js";
import { registerReleaseListTool } from "../../../packages/server-github/src/tools/release-list.js";

type ToolHandler = (params: Record<string, unknown>) => Promise<{
  content: unknown[];
  structuredContent: unknown;
}>;

class FakeServer {
  tools = new Map<string, { handler: ToolHandler }>();
  registerTool(name: string, _config: Record<string, unknown>, handler: ToolHandler) {
    this.tools.set(name, { handler });
  }
}

function mockGh(stdout: string, stderr = "", exitCode = 0) {
  vi.mocked(ghCmd).mockResolvedValueOnce({ stdout, stderr, exitCode });
}

// ── Sample data ───────────────────────────────────────────────────────

const SAMPLE_RUN = {
  databaseId: 12345,
  status: "completed",
  conclusion: "success",
  name: "CI",
  workflowName: "CI",
  headBranch: "main",
  url: "https://github.com/owner/repo/actions/runs/12345",
  createdAt: "2026-02-17T10:00:00Z",
  headSha: "abc123def456",
  event: "push",
  startedAt: "2026-02-17T10:00:00Z",
  attempt: 1,
};

const SAMPLE_RUN_IN_PROGRESS = {
  ...SAMPLE_RUN,
  databaseId: 12346,
  status: "in_progress",
  conclusion: null,
  url: "https://github.com/owner/repo/actions/runs/12346",
};

const SAMPLE_RUN_VIEW_JSON = {
  databaseId: 12345,
  status: "completed",
  conclusion: "success",
  name: "CI",
  workflowName: "CI",
  headBranch: "main",
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
  url: "https://github.com/owner/repo/actions/runs/12345",
  createdAt: "2026-02-17T10:00:00Z",
  headSha: "abc123",
  event: "push",
  startedAt: "2026-02-17T10:00:00Z",
  updatedAt: "2026-02-17T10:05:00Z",
  attempt: 1,
};

const SAMPLE_RELEASE = {
  tagName: "v1.0.0",
  name: "Release 1.0.0",
  isDraft: false,
  isPrerelease: false,
  publishedAt: "2026-02-17T10:00:00Z",
  url: "https://github.com/owner/repo/releases/tag/v1.0.0",
  isLatest: true,
  createdAt: "2026-02-17T09:00:00Z",
};

// =====================================================================
// run-list (21 scenarios)
// =====================================================================
describe("Smoke: github.run-list", () => {
  let handler: ToolHandler;

  beforeEach(() => {
    vi.mocked(ghCmd).mockReset();
    const server = new FakeServer();
    registerRunListTool(server as never);
    handler = server.tools.get("run-list")!.handler;
  });

  async function callAndValidate(params: Record<string, unknown>) {
    const result = await handler(params);
    expect(result).toHaveProperty("structuredContent");
    expect(result).toHaveProperty("content");
    const parsed = RunListResultSchema.parse(result.structuredContent);
    return { result, parsed };
  }

  // S1 [P0] List runs happy path
  it("S1 [P0] list runs happy path", async () => {
    const runs = [SAMPLE_RUN, { ...SAMPLE_RUN, databaseId: 12346 }];
    mockGh(JSON.stringify(runs)); // main query
    mockGh(JSON.stringify(runs)); // count probe
    const { parsed } = await callAndValidate({});
    expect(parsed.runs.length).toBe(2);
    expect(parsed.total).toBeGreaterThanOrEqual(0);
    expect(parsed.runs[0].id).toBe(12345);
    expect(parsed.runs[0].workflowName).toBe("CI");
    expect(parsed.runs[0].status).toBe("completed");
  });

  // S2 [P0] Empty run list
  it("S2 [P0] empty run list", async () => {
    mockGh("[]"); // main query
    mockGh("[]"); // count probe
    const { parsed } = await callAndValidate({ branch: "nonexistent-branch-xyz" });
    expect(parsed.runs).toEqual([]);
    expect(parsed.total).toBe(0);
  });

  // S3 [P0] Flag injection on branch
  it("S3 [P0] flag injection on branch", async () => {
    await expect(callAndValidate({ branch: "--exec=evil" })).rejects.toThrow();
  });

  // S4 [P0] Flag injection on workflow
  it("S4 [P0] flag injection on workflow", async () => {
    await expect(callAndValidate({ workflow: "--exec=evil" })).rejects.toThrow();
  });

  // S5 [P0] Flag injection on commit
  it("S5 [P0] flag injection on commit", async () => {
    await expect(callAndValidate({ commit: "--exec=evil" })).rejects.toThrow();
  });

  // S6 [P0] Flag injection on repo
  it("S6 [P0] flag injection on repo", async () => {
    await expect(callAndValidate({ repo: "--exec=evil" })).rejects.toThrow();
  });

  // S7 [P0] Flag injection on event
  it("S7 [P0] flag injection on event", async () => {
    await expect(callAndValidate({ event: "--exec=evil" })).rejects.toThrow();
  });

  // S8 [P0] Flag injection on user
  it("S8 [P0] flag injection on user", async () => {
    await expect(callAndValidate({ user: "--exec=evil" })).rejects.toThrow();
  });

  // S9 [P0] Flag injection on created
  it("S9 [P0] flag injection on created", async () => {
    await expect(callAndValidate({ created: "--exec=evil" })).rejects.toThrow();
  });

  // S10 [P1] Filter by branch
  it("S10 [P1] filter by branch", async () => {
    const runs = [SAMPLE_RUN];
    mockGh(JSON.stringify(runs)); // main query
    mockGh(JSON.stringify(runs)); // count probe
    await callAndValidate({ branch: "main" });
    const args = vi.mocked(ghCmd).mock.calls[0][0];
    expect(args).toContain("--branch");
    expect(args).toContain("main");
  });

  // S11 [P1] Filter by status
  it("S11 [P1] filter by status", async () => {
    const runs = [SAMPLE_RUN];
    mockGh(JSON.stringify(runs));
    mockGh(JSON.stringify(runs));
    await callAndValidate({ status: "success" });
    const args = vi.mocked(ghCmd).mock.calls[0][0];
    expect(args).toContain("--status");
    expect(args).toContain("success");
  });

  // S12 [P1] Filter by workflow
  it("S12 [P1] filter by workflow", async () => {
    mockGh(JSON.stringify([SAMPLE_RUN]));
    mockGh(JSON.stringify([SAMPLE_RUN]));
    await callAndValidate({ workflow: "ci.yml" });
    const args = vi.mocked(ghCmd).mock.calls[0][0];
    expect(args).toContain("--workflow");
    expect(args).toContain("ci.yml");
  });

  // S13 [P1] Filter by commit
  it("S13 [P1] filter by commit", async () => {
    mockGh(JSON.stringify([SAMPLE_RUN]));
    mockGh(JSON.stringify([SAMPLE_RUN]));
    await callAndValidate({ commit: "abc123" });
    const args = vi.mocked(ghCmd).mock.calls[0][0];
    expect(args).toContain("--commit");
    expect(args).toContain("abc123");
  });

  // S14 [P1] totalAvailable count
  it("S14 [P1] totalAvailable count", async () => {
    const runs5 = [SAMPLE_RUN, SAMPLE_RUN, SAMPLE_RUN, SAMPLE_RUN, SAMPLE_RUN];
    const runs10 = [...runs5, ...runs5];
    mockGh(JSON.stringify(runs5)); // main with limit 5
    mockGh(JSON.stringify(runs10)); // count probe with limit 1000
    const { parsed } = await callAndValidate({ limit: 5 });
    expect(parsed.totalAvailable).toBe(10);
  });

  // S15 [P1] Compact vs full output
  it("S15 [P1] compact vs full output", async () => {
    mockGh(JSON.stringify([SAMPLE_RUN]));
    mockGh(JSON.stringify([SAMPLE_RUN]));
    const { parsed } = await callAndValidate({ compact: false });
    expect(parsed.runs.length).toBe(1);
  });

  // S16 [P1] Cross-repo listing
  it("S16 [P1] cross-repo listing", async () => {
    mockGh(JSON.stringify([SAMPLE_RUN]));
    mockGh(JSON.stringify([SAMPLE_RUN]));
    await callAndValidate({ repo: "owner/repo" });
    const args = vi.mocked(ghCmd).mock.calls[0][0];
    expect(args).toContain("--repo");
    expect(args).toContain("owner/repo");
  });

  // S17 [P1] Include all (disabled workflows)
  it("S17 [P1] include all disabled workflows", async () => {
    mockGh(JSON.stringify([SAMPLE_RUN]));
    mockGh(JSON.stringify([SAMPLE_RUN]));
    await callAndValidate({ all: true });
    const args = vi.mocked(ghCmd).mock.calls[0][0];
    expect(args).toContain("--all");
  });

  // S18 [P1] Filter by event
  it("S18 [P1] filter by event", async () => {
    mockGh(JSON.stringify([SAMPLE_RUN]));
    mockGh(JSON.stringify([SAMPLE_RUN]));
    await callAndValidate({ event: "push" });
    const args = vi.mocked(ghCmd).mock.calls[0][0];
    expect(args).toContain("--event");
    expect(args).toContain("push");
  });

  // S19 [P1] Expanded fields (headSha, event, attempt)
  it("S19 [P1] expanded fields populated in run items", async () => {
    mockGh(JSON.stringify([SAMPLE_RUN]));
    mockGh(JSON.stringify([SAMPLE_RUN]));
    const { parsed } = await callAndValidate({ compact: false });
    const run = parsed.runs[0];
    expect(run.headSha).toBe("abc123def456");
    expect(run.event).toBe("push");
    expect(run.attempt).toBe(1);
  });

  // S20 [P2] Filter by user
  it("S20 [P2] filter by user", async () => {
    mockGh(JSON.stringify([SAMPLE_RUN]));
    mockGh(JSON.stringify([SAMPLE_RUN]));
    await callAndValidate({ user: "octocat" });
    const args = vi.mocked(ghCmd).mock.calls[0][0];
    expect(args).toContain("--user");
    expect(args).toContain("octocat");
  });

  // S21 [P2] Filter by created
  it("S21 [P2] filter by created", async () => {
    mockGh(JSON.stringify([SAMPLE_RUN]));
    mockGh(JSON.stringify([SAMPLE_RUN]));
    await callAndValidate({ created: ">2024-01-01" });
    const args = vi.mocked(ghCmd).mock.calls[0][0];
    expect(args).toContain("--created");
    expect(args).toContain(">2024-01-01");
  });
});

// =====================================================================
// run-rerun (11 scenarios)
// =====================================================================
describe("Smoke: github.run-rerun", () => {
  let handler: ToolHandler;

  beforeEach(() => {
    vi.mocked(ghCmd).mockReset();
    const server = new FakeServer();
    registerRunRerunTool(server as never);
    handler = server.tools.get("run-rerun")!.handler;
  });

  async function callAndValidate(params: Record<string, unknown>) {
    const result = await handler(params);
    expect(result).toHaveProperty("structuredContent");
    expect(result).toHaveProperty("content");
    const parsed = RunRerunResultSchema.parse(result.structuredContent);
    return { result, parsed };
  }

  // S1 [P0] Rerun all jobs happy path
  it("S1 [P0] rerun all jobs happy path", async () => {
    mockGh("", "Requested rerun of run 12345\nhttps://github.com/owner/repo/actions/runs/12345", 0);
    const { parsed } = await callAndValidate({ runId: 12345 });
    expect(parsed.status).toBe("requested-full");
    expect(parsed.failedOnly).toBe(false);
    expect(parsed.url).toContain("actions/runs/12345");
  });

  // S2 [P0] Rerun failed jobs only
  it("S2 [P0] rerun failed jobs only", async () => {
    mockGh(
      "",
      "Requested rerun (failed jobs) of run 12345\nhttps://github.com/owner/repo/actions/runs/12345",
      0,
    );
    const { parsed } = await callAndValidate({ runId: 12345, failedOnly: true });
    expect(parsed.status).toBe("requested-failed");
    expect(parsed.failedOnly).toBe(true);
  });

  // S3 [P0] Run not found
  it("S3 [P0] run not found", async () => {
    mockGh("", "could not resolve workflow run 99999999: not found", 1);
    const { parsed } = await callAndValidate({ runId: 99999999 });
    expect(parsed.status).toBe("error");
    expect(parsed.errorType).toBe("not-found");
  });

  // S4 [P0] Run in progress (cannot rerun)
  it("S4 [P0] run in progress cannot rerun", async () => {
    mockGh("", "cannot rerun while run is in progress", 1);
    const { parsed } = await callAndValidate({ runId: 12345 });
    expect(parsed.status).toBe("error");
    expect(parsed.errorType).toBe("in-progress");
  });

  // S5 [P0] Flag injection on repo
  it("S5 [P0] flag injection on repo", async () => {
    await expect(callAndValidate({ runId: 12345, repo: "--exec=evil" })).rejects.toThrow();
  });

  // S6 [P0] Flag injection on job
  it("S6 [P0] flag injection on job", async () => {
    await expect(callAndValidate({ runId: 12345, job: "--exec=evil" })).rejects.toThrow();
  });

  // S7 [P0] Permission denied
  it("S7 [P0] permission denied", async () => {
    mockGh("", "HTTP 403: Forbidden", 1);
    const { parsed } = await callAndValidate({ runId: 12345 });
    expect(parsed.status).toBe("error");
    expect(parsed.errorType).toBe("permission-denied");
  });

  // S8 [P1] Rerun specific job
  it("S8 [P1] rerun specific job", async () => {
    mockGh(
      "",
      "Requested rerun of run 12345 (job 67890)\nhttps://github.com/owner/repo/actions/runs/12345",
      0,
    );
    const { parsed } = await callAndValidate({ runId: 12345, job: "67890" });
    expect(parsed.status).toBe("requested-job");
    expect(parsed.job).toBe("67890");
    const args = vi.mocked(ghCmd).mock.calls[0][0];
    expect(args).toContain("--job");
    expect(args).toContain("67890");
  });

  // S9 [P1] Debug mode
  it("S9 [P1] debug mode", async () => {
    mockGh("", "Requested rerun of run 12345\nhttps://github.com/owner/repo/actions/runs/12345", 0);
    await callAndValidate({ runId: 12345, debug: true });
    const args = vi.mocked(ghCmd).mock.calls[0][0];
    expect(args).toContain("--debug");
  });

  // S10 [P1] Cross-repo rerun
  it("S10 [P1] cross-repo rerun", async () => {
    mockGh("", "Requested rerun of run 12345\nhttps://github.com/owner/repo/actions/runs/12345", 0);
    await callAndValidate({ runId: 12345, repo: "owner/repo" });
    const args = vi.mocked(ghCmd).mock.calls[0][0];
    expect(args).toContain("--repo");
    expect(args).toContain("owner/repo");
  });

  // S11 [P2] Rerun attempt number in output
  it("S11 [P2] rerun attempt number in output", async () => {
    mockGh(
      "",
      "Requested rerun of run 12345 attempt #2\nhttps://github.com/owner/repo/actions/runs/12345",
      0,
    );
    const { parsed } = await callAndValidate({ runId: 12345 });
    expect(parsed.attempt).toBe(2);
  });
});

// =====================================================================
// run-view (15 scenarios)
// =====================================================================
describe("Smoke: github.run-view", () => {
  let handler: ToolHandler;

  beforeEach(() => {
    vi.mocked(ghCmd).mockReset();
    const server = new FakeServer();
    registerRunViewTool(server as never);
    handler = server.tools.get("run-view")!.handler;
  });

  async function callAndValidate(params: Record<string, unknown>) {
    const result = await handler(params);
    expect(result).toHaveProperty("structuredContent");
    expect(result).toHaveProperty("content");
    const parsed = RunViewResultSchema.parse(result.structuredContent);
    return { result, parsed };
  }

  // S1 [P0] View run happy path
  it("S1 [P0] view run happy path", async () => {
    mockGh(JSON.stringify(SAMPLE_RUN_VIEW_JSON));
    const { parsed } = await callAndValidate({ id: 12345 });
    expect(parsed.id).toBe(12345);
    expect(parsed.status).toBe("completed");
    expect(parsed.conclusion).toBe("success");
    expect(parsed.workflowName).toBe("CI");
    expect(parsed.headBranch).toBe("main");
    expect(parsed.url).toContain("actions/runs/12345");
  });

  // S2 [P0] Run not found
  it("S2 [P0] run not found", async () => {
    mockGh("", "could not find run 99999999", 1);
    await expect(callAndValidate({ id: 99999999 })).rejects.toThrow("gh run view failed");
  });

  // S3 [P0] Flag injection on job
  it("S3 [P0] flag injection on job", async () => {
    await expect(callAndValidate({ id: 12345, job: "--exec=evil" })).rejects.toThrow();
  });

  // S4 [P0] Flag injection on repo
  it("S4 [P0] flag injection on repo", async () => {
    await expect(callAndValidate({ id: 12345, repo: "--exec=evil" })).rejects.toThrow();
  });

  // S5 [P0] Completed run with conclusion
  it("S5 [P0] completed run with conclusion", async () => {
    const failedRun = { ...SAMPLE_RUN_VIEW_JSON, conclusion: "failure" };
    mockGh(JSON.stringify(failedRun));
    const { parsed } = await callAndValidate({ id: 12345 });
    expect(parsed.status).toBe("completed");
    expect(parsed.conclusion).toBe("failure");
  });

  // S6 [P0] In-progress run
  it("S6 [P0] in-progress run", async () => {
    const inProgress = {
      ...SAMPLE_RUN_VIEW_JSON,
      status: "in_progress",
      conclusion: null,
    };
    mockGh(JSON.stringify(inProgress));
    const { parsed } = await callAndValidate({ id: 12345 });
    expect(parsed.status).toBe("in_progress");
    expect(parsed.conclusion).toBeNull();
  });

  // S7 [P1] Run with jobs and steps
  it("S7 [P1] run with jobs and steps", async () => {
    mockGh(JSON.stringify(SAMPLE_RUN_VIEW_JSON));
    const { parsed } = await callAndValidate({ id: 12345, compact: false });
    expect(parsed.jobs).toBeDefined();
    expect(parsed.jobs!.length).toBe(1);
    expect(parsed.jobs![0].name).toBe("build");
    expect(parsed.jobs![0].status).toBe("completed");
    expect(parsed.jobs![0].conclusion).toBe("success");
    expect(parsed.jobs![0].steps).toBeDefined();
    expect(parsed.jobs![0].steps!.length).toBe(2);
    expect(parsed.jobs![0].steps![0].name).toBe("Checkout");
  });

  // S8 [P1] Log failed steps
  it("S8 [P1] log failed steps", async () => {
    const logOutput = "build\tCheckout\t2026-02-17T10:00:00Z FAIL\nError: test failed";
    mockGh(logOutput);
    const { parsed } = await callAndValidate({ id: 12345, logFailed: true });
    expect(parsed.logs).toBe(logOutput);
    // Verify --json is NOT passed, --log-failed IS passed
    const args = vi.mocked(ghCmd).mock.calls[0][0];
    expect(args).toContain("--log-failed");
    expect(args).not.toContain("--json");
  });

  // S9 [P1] Full logs
  it("S9 [P1] full logs", async () => {
    const logOutput =
      "build\tCheckout\t2026-02-17T10:00:00Z OK\nbuild\tBuild\t2026-02-17T10:01:00Z OK";
    mockGh(logOutput);
    const { parsed } = await callAndValidate({ id: 12345, log: true });
    expect(parsed.logs).toBe(logOutput);
    const args = vi.mocked(ghCmd).mock.calls[0][0];
    expect(args).toContain("--log");
    expect(args).not.toContain("--json");
  });

  // S10 [P1] Specific attempt
  it("S10 [P1] specific attempt", async () => {
    const attempt2 = { ...SAMPLE_RUN_VIEW_JSON, attempt: 2 };
    mockGh(JSON.stringify(attempt2));
    const { parsed } = await callAndValidate({ id: 12345, attempt: 2, compact: false });
    const args = vi.mocked(ghCmd).mock.calls[0][0];
    expect(args).toContain("--attempt");
    expect(args).toContain("2");
    expect(parsed.attempt).toBe(2);
  });

  // S11 [P1] View specific job
  it("S11 [P1] view specific job", async () => {
    mockGh(JSON.stringify(SAMPLE_RUN_VIEW_JSON));
    await callAndValidate({ id: 12345, job: "67890" });
    const args = vi.mocked(ghCmd).mock.calls[0][0];
    expect(args).toContain("--job");
    expect(args).toContain("67890");
  });

  // S12 [P1] Cross-repo view
  it("S12 [P1] cross-repo view", async () => {
    mockGh(JSON.stringify(SAMPLE_RUN_VIEW_JSON));
    await callAndValidate({ id: 12345, repo: "owner/repo" });
    const args = vi.mocked(ghCmd).mock.calls[0][0];
    expect(args).toContain("--repo");
    expect(args).toContain("owner/repo");
  });

  // S13 [P1] Compact vs full output
  it("S13 [P1] compact vs full output", async () => {
    mockGh(JSON.stringify(SAMPLE_RUN_VIEW_JSON));
    const { parsed } = await callAndValidate({ id: 12345, compact: false });
    expect(parsed.id).toBe(12345);
    expect(parsed.jobs).toBeDefined();
  });

  // S14 [P1] Run metadata fields
  it("S14 [P1] run metadata fields populated", async () => {
    mockGh(JSON.stringify(SAMPLE_RUN_VIEW_JSON));
    const { parsed } = await callAndValidate({ id: 12345, compact: false });
    expect(parsed.headSha).toBe("abc123");
    expect(parsed.event).toBe("push");
    expect(parsed.startedAt).toBe("2026-02-17T10:00:00Z");
    expect(parsed.updatedAt).toBe("2026-02-17T10:05:00Z");
    expect(parsed.durationSeconds).toBeDefined();
    expect(parsed.durationSeconds).toBe(300);
  });

  // S15 [P2] Exit status mode
  it("S15 [P2] exit status mode", async () => {
    mockGh(JSON.stringify(SAMPLE_RUN_VIEW_JSON));
    await callAndValidate({ id: 12345, exitStatus: true });
    const args = vi.mocked(ghCmd).mock.calls[0][0];
    expect(args).toContain("--exit-status");
  });
});

// =====================================================================
// release-create (25 scenarios)
// =====================================================================
describe("Smoke: github.release-create", () => {
  let handler: ToolHandler;

  beforeEach(() => {
    vi.mocked(ghCmd).mockReset();
    const server = new FakeServer();
    registerReleaseCreateTool(server as never);
    handler = server.tools.get("release-create")!.handler;
  });

  async function callAndValidate(params: Record<string, unknown>) {
    const result = await handler(params);
    expect(result).toHaveProperty("structuredContent");
    expect(result).toHaveProperty("content");
    const parsed = ReleaseCreateResultSchema.parse(result.structuredContent);
    return { result, parsed };
  }

  // S1 [P0] Create release happy path
  it("S1 [P0] create release happy path", async () => {
    mockGh("https://github.com/owner/repo/releases/tag/v1.0.0");
    const { parsed } = await callAndValidate({ tag: "v1.0.0" });
    expect(parsed.tag).toBe("v1.0.0");
    expect(parsed.url).toContain("releases/tag/v1.0.0");
    expect(parsed.draft).toBe(false);
    expect(parsed.prerelease).toBe(false);
  });

  // S2 [P0] Tag conflict (already exists)
  it("S2 [P0] tag conflict already exists", async () => {
    mockGh("", "tag v1.0.0 already exists", 1);
    const { parsed } = await callAndValidate({ tag: "v1.0.0" });
    expect(parsed.errorType).toBe("tag-conflict");
  });

  // S3 [P0] Permission denied
  it("S3 [P0] permission denied", async () => {
    mockGh("", "HTTP 403: Forbidden", 1);
    const { parsed } = await callAndValidate({ tag: "v1.0.0" });
    expect(parsed.errorType).toBe("permission-denied");
  });

  // S4 [P0] Flag injection on tag
  it("S4 [P0] flag injection on tag", async () => {
    await expect(callAndValidate({ tag: "--exec=evil" })).rejects.toThrow();
  });

  // S5 [P0] Flag injection on title
  it("S5 [P0] flag injection on title", async () => {
    await expect(callAndValidate({ tag: "v1.0.0", title: "--exec=evil" })).rejects.toThrow();
  });

  // S6 [P0] Flag injection on target
  it("S6 [P0] flag injection on target", async () => {
    await expect(callAndValidate({ tag: "v1.0.0", target: "--exec=evil" })).rejects.toThrow();
  });

  // S7 [P0] Flag injection on repo
  it("S7 [P0] flag injection on repo", async () => {
    await expect(callAndValidate({ tag: "v1.0.0", repo: "--exec=evil" })).rejects.toThrow();
  });

  // S8 [P0] Flag injection on notesFile
  it("S8 [P0] flag injection on notesFile", async () => {
    await expect(callAndValidate({ tag: "v1.0.0", notesFile: "--exec=evil" })).rejects.toThrow();
  });

  // S9 [P0] Flag injection on notesStartTag
  it("S9 [P0] flag injection on notesStartTag", async () => {
    await expect(
      callAndValidate({ tag: "v1.0.0", notesStartTag: "--exec=evil" }),
    ).rejects.toThrow();
  });

  // S10 [P0] Flag injection on discussionCategory
  it("S10 [P0] flag injection on discussionCategory", async () => {
    await expect(
      callAndValidate({ tag: "v1.0.0", discussionCategory: "--exec=evil" }),
    ).rejects.toThrow();
  });

  // S11 [P0] Flag injection on assets entry
  it("S11 [P0] flag injection on assets entry", async () => {
    await expect(callAndValidate({ tag: "v1.0.0", assets: ["--exec=evil"] })).rejects.toThrow();
  });

  // S12 [P0] Shell escaping in notes (#530 pattern)
  it("S12 [P0] shell escaping in notes delivered via stdin", async () => {
    mockGh("https://github.com/owner/repo/releases/tag/v1.0.0");
    const notesWithSpecialChars = "Use `cmd | grep` and $(var)";
    await callAndValidate({ tag: "v1.0.0", notes: notesWithSpecialChars });
    // Verify notes are sent via --notes-file - (stdin), not --notes
    const args = vi.mocked(ghCmd).mock.calls[0][0];
    expect(args).toContain("--notes-file");
    expect(args).toContain("-");
    expect(args).not.toContain("--notes");
    // Verify stdin was passed in options
    const opts = vi.mocked(ghCmd).mock.calls[0][1] as { cwd: string; stdin: string };
    expect(opts.stdin).toBe(notesWithSpecialChars);
  });

  // S13 [P1] Draft release
  it("S13 [P1] draft release", async () => {
    mockGh("https://github.com/owner/repo/releases/tag/v1.0.0");
    const { parsed } = await callAndValidate({ tag: "v1.0.0", draft: true });
    expect(parsed.draft).toBe(true);
    const args = vi.mocked(ghCmd).mock.calls[0][0];
    expect(args).toContain("--draft");
  });

  // S14 [P1] Prerelease
  it("S14 [P1] prerelease", async () => {
    mockGh("https://github.com/owner/repo/releases/tag/v1.0.0-beta.1");
    const { parsed } = await callAndValidate({ tag: "v1.0.0-beta.1", prerelease: true });
    expect(parsed.prerelease).toBe(true);
    const args = vi.mocked(ghCmd).mock.calls[0][0];
    expect(args).toContain("--prerelease");
  });

  // S15 [P1] With title
  it("S15 [P1] with title", async () => {
    mockGh("https://github.com/owner/repo/releases/tag/v1.0.0");
    const { parsed } = await callAndValidate({ tag: "v1.0.0", title: "Release 1.0" });
    expect(parsed.title).toBe("Release 1.0");
    const args = vi.mocked(ghCmd).mock.calls[0][0];
    expect(args).toContain("--title");
    expect(args).toContain("Release 1.0");
  });

  // S16 [P1] Generate notes
  it("S16 [P1] generate notes", async () => {
    mockGh("https://github.com/owner/repo/releases/tag/v1.0.0");
    await callAndValidate({ tag: "v1.0.0", generateNotes: true });
    const args = vi.mocked(ghCmd).mock.calls[0][0];
    expect(args).toContain("--generate-notes");
  });

  // S17 [P1] Verify tag
  it("S17 [P1] verify tag", async () => {
    mockGh("https://github.com/owner/repo/releases/tag/v1.0.0");
    await callAndValidate({ tag: "v1.0.0", verifyTag: true });
    const args = vi.mocked(ghCmd).mock.calls[0][0];
    expect(args).toContain("--verify-tag");
  });

  // S18 [P1] Target branch
  it("S18 [P1] target branch", async () => {
    mockGh("https://github.com/owner/repo/releases/tag/v1.0.0");
    await callAndValidate({ tag: "v1.0.0", target: "release/1.0" });
    const args = vi.mocked(ghCmd).mock.calls[0][0];
    expect(args).toContain("--target");
    expect(args).toContain("release/1.0");
  });

  // S19 [P1] With assets
  it("S19 [P1] with assets", async () => {
    mockGh("https://github.com/owner/repo/releases/tag/v1.0.0");
    const { parsed } = await callAndValidate({
      tag: "v1.0.0",
      assets: ["dist/app.zip", "dist/checksum.txt"],
    });
    expect(parsed.assetsUploaded).toBe(2);
    const args = vi.mocked(ghCmd).mock.calls[0][0];
    expect(args).toContain("dist/app.zip");
    expect(args).toContain("dist/checksum.txt");
  });

  // S20 [P1] Fail on no commits
  it("S20 [P1] fail on no commits error", async () => {
    mockGh("", "no new commits since last release", 1);
    const { parsed } = await callAndValidate({ tag: "v1.0.0", failOnNoCommits: true });
    expect(parsed.errorType).toBe("no-new-commits");
    const args = vi.mocked(ghCmd).mock.calls[0][0];
    expect(args).toContain("--fail-on-no-commits");
  });

  // S21 [P1] Cross-repo release
  it("S21 [P1] cross-repo release", async () => {
    mockGh("https://github.com/owner/repo/releases/tag/v1.0.0");
    await callAndValidate({ tag: "v1.0.0", repo: "owner/repo" });
    const args = vi.mocked(ghCmd).mock.calls[0][0];
    expect(args).toContain("--repo");
    expect(args).toContain("owner/repo");
  });

  // S22 [P2] Latest flag true
  it("S22 [P2] latest flag true", async () => {
    mockGh("https://github.com/owner/repo/releases/tag/v1.0.0");
    await callAndValidate({ tag: "v1.0.0", latest: true });
    const args = vi.mocked(ghCmd).mock.calls[0][0];
    expect(args).toContain("--latest=true");
  });

  // S23 [P2] Latest flag false
  it("S23 [P2] latest flag false", async () => {
    mockGh("https://github.com/owner/repo/releases/tag/v1.0.0");
    await callAndValidate({ tag: "v1.0.0", latest: false });
    const args = vi.mocked(ghCmd).mock.calls[0][0];
    expect(args).toContain("--latest=false");
  });

  // S24 [P2] Notes from tag
  it("S24 [P2] notes from tag", async () => {
    mockGh("https://github.com/owner/repo/releases/tag/v1.0.0");
    await callAndValidate({ tag: "v1.0.0", notesFromTag: true });
    const args = vi.mocked(ghCmd).mock.calls[0][0];
    expect(args).toContain("--notes-from-tag");
  });

  // S25 [P2] Discussion category
  it("S25 [P2] discussion category", async () => {
    mockGh("https://github.com/owner/repo/releases/tag/v1.0.0");
    await callAndValidate({ tag: "v1.0.0", discussionCategory: "Announcements" });
    const args = vi.mocked(ghCmd).mock.calls[0][0];
    expect(args).toContain("--discussion-category");
    expect(args).toContain("Announcements");
  });
});

// =====================================================================
// release-list (12 scenarios)
// =====================================================================
describe("Smoke: github.release-list", () => {
  let handler: ToolHandler;

  beforeEach(() => {
    vi.mocked(ghCmd).mockReset();
    const server = new FakeServer();
    registerReleaseListTool(server as never);
    handler = server.tools.get("release-list")!.handler;
  });

  async function callAndValidate(params: Record<string, unknown>) {
    const result = await handler(params);
    expect(result).toHaveProperty("structuredContent");
    expect(result).toHaveProperty("content");
    const parsed = ReleaseListResultSchema.parse(result.structuredContent);
    return { result, parsed };
  }

  // S1 [P0] List releases happy path
  it("S1 [P0] list releases happy path", async () => {
    const releases = [SAMPLE_RELEASE, { ...SAMPLE_RELEASE, tagName: "v0.9.0", isLatest: false }];
    mockGh(JSON.stringify(releases)); // main query
    mockGh(JSON.stringify(releases)); // count probe
    const { parsed } = await callAndValidate({});
    expect(parsed.releases.length).toBe(2);
    expect(parsed.total).toBeGreaterThanOrEqual(0);
    expect(parsed.releases[0].tag).toBe("v1.0.0");
    expect(parsed.releases[0].name).toBe("Release 1.0.0");
    expect(parsed.releases[0].draft).toBe(false);
    expect(parsed.releases[0].prerelease).toBe(false);
  });

  // S2 [P0] Empty release list
  it("S2 [P0] empty release list", async () => {
    mockGh("[]"); // main query
    mockGh("[]"); // count probe
    const { parsed } = await callAndValidate({ repo: "owner/empty-repo" });
    expect(parsed.releases).toEqual([]);
    expect(parsed.total).toBe(0);
  });

  // S3 [P0] Flag injection on repo
  it("S3 [P0] flag injection on repo", async () => {
    await expect(callAndValidate({ repo: "--exec=evil" })).rejects.toThrow();
  });

  // S4 [P0] Error: repo not found
  it("S4 [P0] error repo not found", async () => {
    mockGh("", "Could not resolve to a Repository with the name 'nonexistent/repo'", 1);
    await expect(callAndValidate({ repo: "nonexistent/repo" })).rejects.toThrow(
      "gh release list failed",
    );
  });

  // S5 [P1] Exclude drafts
  it("S5 [P1] exclude drafts", async () => {
    const releases = [SAMPLE_RELEASE];
    mockGh(JSON.stringify(releases));
    mockGh(JSON.stringify(releases));
    await callAndValidate({ excludeDrafts: true });
    const args = vi.mocked(ghCmd).mock.calls[0][0];
    expect(args).toContain("--exclude-drafts");
  });

  // S6 [P1] Exclude pre-releases
  it("S6 [P1] exclude pre-releases", async () => {
    const releases = [SAMPLE_RELEASE];
    mockGh(JSON.stringify(releases));
    mockGh(JSON.stringify(releases));
    await callAndValidate({ excludePreReleases: true });
    const args = vi.mocked(ghCmd).mock.calls[0][0];
    expect(args).toContain("--exclude-pre-releases");
  });

  // S7 [P1] Order ascending
  it("S7 [P1] order ascending", async () => {
    const releases = [SAMPLE_RELEASE];
    mockGh(JSON.stringify(releases));
    mockGh(JSON.stringify(releases));
    await callAndValidate({ order: "asc" });
    const args = vi.mocked(ghCmd).mock.calls[0][0];
    expect(args).toContain("--order");
    expect(args).toContain("asc");
  });

  // S8 [P1] totalAvailable count
  it("S8 [P1] totalAvailable count", async () => {
    const releases5 = Array(5).fill(SAMPLE_RELEASE);
    const releases10 = Array(10).fill(SAMPLE_RELEASE);
    mockGh(JSON.stringify(releases5)); // main with limit 5
    mockGh(JSON.stringify(releases10)); // count probe with limit 1000
    const { parsed } = await callAndValidate({ limit: 5, compact: false });
    expect(parsed.totalAvailable).toBe(10);
  });

  // S9 [P1] Compact vs full output
  it("S9 [P1] compact vs full output", async () => {
    mockGh(JSON.stringify([SAMPLE_RELEASE]));
    mockGh(JSON.stringify([SAMPLE_RELEASE]));
    const { parsed } = await callAndValidate({ compact: false });
    expect(parsed.releases.length).toBe(1);
  });

  // S10 [P1] Cross-repo listing
  it("S10 [P1] cross-repo listing", async () => {
    mockGh(JSON.stringify([SAMPLE_RELEASE]));
    mockGh(JSON.stringify([SAMPLE_RELEASE]));
    await callAndValidate({ repo: "owner/repo" });
    const args = vi.mocked(ghCmd).mock.calls[0][0];
    expect(args).toContain("--repo");
    expect(args).toContain("owner/repo");
  });

  // S11 [P1] Release fields populated
  it("S11 [P1] release fields populated", async () => {
    mockGh(JSON.stringify([SAMPLE_RELEASE]));
    mockGh(JSON.stringify([SAMPLE_RELEASE]));
    const { parsed } = await callAndValidate({ compact: false });
    const rel = parsed.releases[0];
    expect(rel.publishedAt).toBe("2026-02-17T10:00:00Z");
    expect(rel.url).toContain("releases/tag/v1.0.0");
    expect(rel.isLatest).toBe(true);
    expect(rel.createdAt).toBe("2026-02-17T09:00:00Z");
  });

  // S12 [P2] Custom limit
  it("S12 [P2] custom limit", async () => {
    const releases = Array(5).fill(SAMPLE_RELEASE);
    mockGh(JSON.stringify(releases));
    mockGh(JSON.stringify(releases));
    const { parsed } = await callAndValidate({ limit: 5 });
    expect(parsed.releases.length).toBeLessThanOrEqual(5);
    // Verify limit is passed to gh CLI
    const args = vi.mocked(ghCmd).mock.calls[0][0];
    expect(args).toContain("--limit");
    expect(args).toContain("5");
  });
});
