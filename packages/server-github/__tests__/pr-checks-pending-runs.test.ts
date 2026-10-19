/**
 * #1159: fast checks can all be done while the PR's main workflow run has not
 * started yet (queued behind a `concurrency` group), so it has no check run and
 * `gh pr checks` cannot see it. Such a PR must not read as "passed".
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../src/lib/gh-runner.js", () => ({ ghCmd: vi.fn() }));

import { ghCmd } from "../src/lib/gh-runner.js";
import {
  watchPrChecks,
  pendingWorkflowRuns,
  registerPrChecksTool,
} from "../src/tools/pr-checks.js";

const SHA = "b90554c45864da0cdd003c045a3981f1431fa933";

/** The three fast checks from the #1159 report, all finished. */
const fastChecksDone = JSON.stringify(
  ["CodeQL", "Analyze (actions)", "review-bot"].map((name) => ({
    name,
    state: "SUCCESS",
    bucket: "pass",
    description: "",
    event: "pull_request",
    workflow: name,
    link: "",
    startedAt: "",
    completedAt: "",
  })),
);

function gh(stdout: string, exitCode = 0, stderr = "") {
  vi.mocked(ghCmd).mockResolvedValueOnce({ stdout, stderr, exitCode });
}

function clock() {
  let nowMs = 0;
  return {
    sleep: async (ms: number) => {
      nowMs += ms;
    },
    now: () => nowMs,
  };
}

describe("pendingWorkflowRuns", () => {
  beforeEach(() => vi.mocked(ghCmd).mockReset());

  it("returns the runs for the head commit that have not completed", async () => {
    gh(`${SHA}\n`);
    gh(
      JSON.stringify([
        { name: "CI", status: "pending" },
        { name: "CodeQL", status: "completed" },
        { name: "CI", status: "in_progress" },
      ]),
    );

    expect(await pendingWorkflowRuns("1159", "owner/repo", "/p")).toEqual(["CI", "CI"]);
    expect(vi.mocked(ghCmd).mock.calls[0][0]).toEqual([
      "pr",
      "view",
      "1159",
      "--json",
      "headRefOid",
      "--jq",
      ".headRefOid",
      "--repo",
      "owner/repo",
    ]);
    expect(vi.mocked(ghCmd).mock.calls[1][0]).toEqual([
      "run",
      "list",
      "--commit",
      SHA,
      "--json",
      "name,status",
      "--limit",
      "100",
      "--repo",
      "owner/repo",
    ]);
  });

  it("returns an empty list when every run has completed", async () => {
    gh(SHA);
    gh(JSON.stringify([{ name: "CI", status: "completed" }]));
    expect(await pendingWorkflowRuns("1", undefined, "/p")).toEqual([]);
  });

  it("returns undefined when the head commit cannot be read", async () => {
    gh("", 1, "no pull requests found");
    expect(await pendingWorkflowRuns("1", undefined, "/p")).toBeUndefined();
    expect(ghCmd).toHaveBeenCalledTimes(1);
  });
});

describe("watchPrChecks with pendingRuns (#1159)", () => {
  beforeEach(() => vi.mocked(ghCmd).mockReset());

  it("keeps polling while a workflow run for the head commit has not completed", async () => {
    gh(fastChecksDone);
    gh(fastChecksDone);
    const pendingRuns = vi
      .fn<() => Promise<string[] | undefined>>()
      .mockResolvedValueOnce(["CI"])
      .mockResolvedValueOnce([]);

    const result = await watchPrChecks([], undefined, 1159, {
      intervalMs: 10_000,
      timeoutMs: 600_000,
      pendingRuns,
      ...clock(),
    });

    expect(result.timedOut).toBe(false);
    expect(result.pollCount).toBe(2);
    expect(result.data.pendingRuns).toBeUndefined();
  });

  it("times out, naming the run, when it never completes", async () => {
    for (let i = 0; i < 10; i++) gh(fastChecksDone);
    const result = await watchPrChecks([], undefined, 1159, {
      intervalMs: 10_000,
      timeoutMs: 30_000,
      pendingRuns: async () => ["CI"],
      ...clock(),
    });

    expect(result.timedOut).toBe(true);
    expect(result.pending).toContain("CI");
    expect(result.data.pendingRuns).toEqual(["CI"]);
  });

  it("concludes on the checks alone when the run lookup fails", async () => {
    gh(fastChecksDone);
    const result = await watchPrChecks([], undefined, 1159, {
      intervalMs: 10_000,
      timeoutMs: 600_000,
      pendingRuns: async () => undefined,
      ...clock(),
    });

    expect(result.timedOut).toBe(false);
    expect(result.pollCount).toBe(1);
  });
});

describe("pr-checks tool (no watch) with a run still to come", () => {
  beforeEach(() => vi.mocked(ghCmd).mockReset());

  function handler() {
    let registered: ((p: Record<string, unknown>) => Promise<unknown>) | undefined;
    registerPrChecksTool({
      registerTool: (_n: string, _c: unknown, h: typeof registered) => {
        registered = h;
      },
    } as never);
    return registered!;
  }

  it("reports pending, not passed, and names the run", async () => {
    gh(fastChecksDone); // gh pr checks
    gh(SHA); // gh pr view headRefOid
    gh(JSON.stringify([{ name: "CI", status: "pending" }])); // gh run list

    const out = (await handler()({ number: "1159", compact: false })) as {
      structuredContent: { conclusion: string; pendingRuns?: string[] };
      content: Array<{ text: string }>;
    };

    expect(out.structuredContent.conclusion).toBe("pending");
    expect(out.structuredContent.pendingRuns).toEqual(["CI"]);
    expect(out.content[0].text).toContain("workflow runs not finished: CI");
  });

  it("still reports passed when every run has completed", async () => {
    gh(fastChecksDone);
    gh(SHA);
    gh(JSON.stringify([{ name: "CI", status: "completed" }]));

    const out = (await handler()({ number: "1159", compact: false })) as {
      structuredContent: { conclusion: string; pendingRuns?: string[] };
    };

    expect(out.structuredContent.conclusion).toBe("passed");
    expect(out.structuredContent.pendingRuns).toBeUndefined();
  });
});
