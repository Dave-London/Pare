import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  compactDualOutput,
  assertNoFlagInjection,
  INPUT_LIMITS,
  compactInput,
  repoPathInput,
} from "@paretools/shared";
import { ghCmd } from "../lib/gh-runner.js";
import { parsePrChecks, resolveNumber } from "../lib/parsers.js";
import { formatPrChecks, compactPrChecksMap, formatPrChecksCompact } from "../lib/formatters.js";
import { PrChecksResultSchema, type PrChecksResult } from "../schemas/index.js";

const PR_CHECKS_FIELDS = "name,state,bucket,description,event,workflow,link,startedAt,completedAt";

const DEFAULT_INTERVAL_SECONDS = 10;
const MIN_INTERVAL_SECONDS = 5;
const MAX_INTERVAL_SECONDS = 300;
const DEFAULT_WATCH_TIMEOUT_SECONDS = 600;
const MAX_WATCH_TIMEOUT_SECONDS = 3600;

/**
 * Grace window (ms) during which an `exitCode: 8` ("checks pending") response
 * from gh outranks a checks array whose entries all look terminal. GitHub
 * registers check runs asynchronously after a push, so an early snapshot can
 * show a complete-looking subset while more runs are still being created
 * (issue #1077).
 */
const SETTLE_GRACE_MS = 30_000;

type PrChecksErrorType =
  "not-found" | "permission-denied" | "in-progress" | "no-checks" | "unknown";

function classifyPrChecksError(stderr: string): PrChecksErrorType {
  const lower = stderr.toLowerCase();
  // gh exits non-zero with this message when the PR simply has no check runs
  // yet. That is "nothing has started", not a failure — see #1077.
  if (/no checks reported/.test(lower)) return "no-checks";
  if (/not found|could not resolve|no pull request/.test(lower)) return "not-found";
  if (/forbidden|permission|403/.test(lower)) return "permission-denied";
  if (/pending|in progress|checks are still running/.test(lower)) return "in-progress";
  return "unknown";
}

/** An all-zero snapshot used whenever gh reports no checks at all. */
function emptySnapshot(prNum: number): PrChecksResult {
  return {
    pr: prNum,
    checks: [],
    summary: { total: 0, passed: 0, failed: 0, pending: 0, skipped: 0, cancelled: 0 },
  };
}

/** True when gh reported zero check runs for the PR. */
function hasNoChecks(data: PrChecksResult): boolean {
  return (data.checks?.length ?? 0) === 0;
}

/** Returns true when no checks are still pending (`bucket: "pending"` or `"queued"`). */
function allChecksComplete(data: PrChecksResult): boolean {
  for (const check of data.checks ?? []) {
    if (check.bucket === "pending" || check.bucket === "queued") return false;
  }
  return true;
}

function pendingCheckNames(data: PrChecksResult): string[] {
  return (data.checks ?? [])
    .filter((c) => c.bucket === "pending" || c.bucket === "queued")
    .map((c) => c.name);
}

/**
 * Aggregate outcome from the summary buckets so callers can branch without
 * re-deriving. `failed` wins over `pending` (a red check is actionable even
 * while others run); `pending` means at least one check is still non-terminal.
 *
 * Zero checks yields `"none"`, never `"passed"` — a PR whose CI has not been
 * registered yet must not read as green to a merge gate (issue #1077).
 *
 * Invariant: `"passed"` implies at least one check, all terminal, none failed.
 */
export function deriveConclusion(data: PrChecksResult): "passed" | "failed" | "pending" | "none" {
  const summary = data.summary;
  if (!summary || summary.total === 0 || hasNoChecks(data)) return "none";
  if (summary.failed > 0 || summary.cancelled > 0) return "failed";
  if (summary.pending > 0) return "pending";
  return "passed";
}

/** Sleeps for `ms` milliseconds. Exposed via parameter for testability. */
function defaultSleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Internal watch loop — polls `gh pr checks --json ...` every `intervalMs`
 * until at least one check exists AND none is still pending, or `timeoutMs`
 * elapses. An empty checks array never ends the loop: that is the push ->
 * check-run-registration race the watch exists to survive (issue #1077).
 *
 * Exported for unit testing; production callers should use the registered tool.
 */
export interface WatchOptions {
  intervalMs: number;
  timeoutMs: number;
  /** Replaceable for tests. Defaults to `setTimeout`. */
  sleep?: (ms: number) => Promise<void>;
  /** Replaceable for tests. Defaults to `Date.now`. */
  now?: () => number;
  /**
   * Window during which an `exitCode: 8` response keeps the loop running even
   * when every reported check already looks terminal. Defaults to
   * {@link SETTLE_GRACE_MS}; set to `0` to disable.
   */
  settleGraceMs?: number;
}

export interface WatchResult {
  data: PrChecksResult;
  pollCount: number;
  waitedSeconds: number;
  timedOut: boolean;
  pending: string[];
  /** True when the loop ended without GitHub ever reporting a single check. */
  neverSawChecks: boolean;
}

export async function watchPrChecks(
  args: string[],
  cwd: string | undefined,
  prNum: number,
  opts: WatchOptions,
): Promise<WatchResult> {
  const sleep = opts.sleep ?? defaultSleep;
  const now = opts.now ?? Date.now;
  const start = now();
  const settleGraceMs = opts.settleGraceMs ?? SETTLE_GRACE_MS;
  let pollCount = 0;
  let lastData: PrChecksResult = emptySnapshot(prNum);

  const finish = (timedOut: boolean, pending: string[]): WatchResult => ({
    data: lastData,
    pollCount,
    waitedSeconds: (now() - start) / 1000,
    timedOut,
    pending,
    neverSawChecks: hasNoChecks(lastData),
  });

  while (true) {
    pollCount++;
    const result = await ghCmd(args, cwd);

    // Exit code 8 means checks are still pending — gh still emits valid JSON.
    if (result.exitCode !== 0 && result.exitCode !== 8) {
      const combined = `${result.stdout}\n${result.stderr}`.trim();
      const errorType = classifyPrChecksError(combined);

      // "no checks reported" is not a failure: GitHub has simply not registered
      // any check runs yet. Keep polling until they appear or the watch
      // deadline passes, rather than bailing out instantly (issue #1077).
      if (errorType !== "no-checks") {
        lastData = {
          ...emptySnapshot(prNum),
          errorType,
          errorMessage: combined || "gh pr checks failed",
        };
        return finish(false, []);
      }

      lastData = {
        ...emptySnapshot(prNum),
        errorType,
        errorMessage: combined || "no checks reported on this pull request",
      };
    } else {
      try {
        lastData = parsePrChecks(result.stdout, prNum);
      } catch {
        const combined = `${result.stdout}\n${result.stderr}`.trim();
        lastData = {
          ...emptySnapshot(prNum),
          errorType: "unknown",
          errorMessage: combined || "Failed to parse pr checks output",
        };
        return finish(false, []);
      }

      // Short settle grace: while gh itself still reports "pending" (exit 8),
      // a checks array that merely *looks* terminal is not trusted — GitHub may
      // still be creating the remaining check runs right after a push.
      const settling = result.exitCode === 8 && now() - start < settleGraceMs;

      // Zero checks never terminates the loop: surviving the
      // push -> check-run-registration race is the whole point of watching.
      if (!hasNoChecks(lastData) && allChecksComplete(lastData) && !settling) {
        return finish(false, []);
      }
    }

    const elapsed = now() - start;
    if (elapsed + opts.intervalMs > opts.timeoutMs) {
      return finish(true, pendingCheckNames(lastData));
    }

    await sleep(opts.intervalMs);
  }
}

/** Registers the `pr-checks` tool on the given MCP server. */
export function registerPrChecksTool(server: McpServer) {
  server.registerTool(
    "pr-checks",
    {
      title: "PR Checks",
      description:
        'Lists check/status results for a pull request. Returns structured data with check names, states, URLs, summary counts (passed, failed, pending), and a top-level `conclusion` ("passed" | "failed" | "pending" | "none" | "timed_out") for easy branching. `conclusion: "passed"` is only ever returned when at least one check exists and all of them succeeded; a PR with zero reported checks returns `conclusion: "none"` (never "passed"), so a merge gate cannot mistake "CI has not started" for "CI is green". When watch=true, polls internally until checks appear AND all complete, or watchTimeout elapses; on timeout it returns the latest snapshot with `timedOut: true` and `conclusion: "timed_out"` rather than throwing.',
      annotations: { readOnlyHint: true, openWorldHint: true },
      inputSchema: {
        number: z
          .string()
          .max(INPUT_LIMITS.STRING_MAX)
          .describe("Pull request number, URL, or branch name"),
        repo: z
          .string()
          .max(INPUT_LIMITS.PATH_MAX)
          .optional()
          .describe("Repository in OWNER/REPO format (default: current repo)"),
        path: repoPathInput,
        watch: z.coerce
          .boolean()
          .optional()
          .describe(
            "Poll internally until at least one check exists AND all are non-pending, or watchTimeout elapses. A PR with no checks yet keeps the loop running instead of concluding early. The wrapper polls gh JSON output (gh's native --watch is incompatible with --json).",
          ),
        interval: z.coerce
          .number()
          .int()
          .min(MIN_INTERVAL_SECONDS)
          .max(MAX_INTERVAL_SECONDS)
          .optional()
          .describe(
            `Polling interval in seconds when watch=true (default ${DEFAULT_INTERVAL_SECONDS}, min ${MIN_INTERVAL_SECONDS}, max ${MAX_INTERVAL_SECONDS}).`,
          ),
        watchTimeout: z.coerce
          .number()
          .int()
          .positive()
          .max(MAX_WATCH_TIMEOUT_SECONDS)
          .optional()
          .describe(
            `Total wall-clock timeout in seconds for the watch loop (default ${DEFAULT_WATCH_TIMEOUT_SECONDS}, max ${MAX_WATCH_TIMEOUT_SECONDS}).`,
          ),
        // S-gap P0: Add required filter
        required: z
          .boolean()
          .optional()
          .describe("Filter to show only required checks (--required)"),
        compact: compactInput,
      },
      outputSchema: PrChecksResultSchema,
    },
    async ({ number, repo, path, watch, interval, watchTimeout, required, compact }) => {
      const cwd = path || process.cwd();

      if (repo) assertNoFlagInjection(repo, "repo");
      if (typeof number === "string") assertNoFlagInjection(number, "number");

      const selector = String(number);
      const prNum = resolveNumber(number);

      // Note: gh rejects `--watch` together with `--json`, so we never pass
      // gh's native --watch. When watch=true the wrapper polls internally.
      const args = ["pr", "checks", selector, "--json", PR_CHECKS_FIELDS];
      if (repo) {
        args.push("--repo", repo);
      }
      if (required) args.push("--required");

      if (watch) {
        const intervalSeconds = interval ?? DEFAULT_INTERVAL_SECONDS;
        const timeoutSeconds = watchTimeout ?? DEFAULT_WATCH_TIMEOUT_SECONDS;
        const watchResult = await watchPrChecks(args, cwd, prNum, {
          intervalMs: intervalSeconds * 1000,
          timeoutMs: timeoutSeconds * 1000,
        });

        if (watchResult.timedOut) {
          // Return a structured snapshot rather than throwing, so callers can
          // branch on `conclusion`/`timedOut` instead of catching an exception.
          const timeoutReason = watchResult.neverSawChecks
            ? `no checks were ever reported on this pull request — CI may not have started`
            : `checks still pending: ${watchResult.pending.join(", ") || "(none reported)"}`;
          const data: PrChecksResult = {
            ...watchResult.data,
            conclusion: "timed_out",
            timedOut: true,
            errorType: "watch-timeout",
            errorMessage: `Watch timed out after ${timeoutSeconds}s — ${timeoutReason}`,
            pollCount: watchResult.pollCount,
            waitedSeconds: Math.round(watchResult.waitedSeconds * 100) / 100,
          };
          return compactDualOutput(
            data,
            JSON.stringify(data.checks ?? []),
            formatPrChecks,
            compactPrChecksMap,
            formatPrChecksCompact,
            compact === false,
          );
        }

        const data: PrChecksResult = {
          ...watchResult.data,
          conclusion: deriveConclusion(watchResult.data),
          timedOut: false,
          pollCount: watchResult.pollCount,
          waitedSeconds: Math.round(watchResult.waitedSeconds * 100) / 100,
        };
        return compactDualOutput(
          data,
          JSON.stringify(data.checks ?? []),
          formatPrChecks,
          compactPrChecksMap,
          formatPrChecksCompact,
          compact === false,
        );
      }

      const result = await ghCmd(args, cwd);

      // Exit code 8 means checks are still pending — gh still returns valid JSON
      if (result.exitCode !== 0 && result.exitCode !== 8) {
        const combined = `${result.stdout}\n${result.stderr}`.trim();
        const errorType = classifyPrChecksError(combined);
        return compactDualOutput(
          {
            ...emptySnapshot(prNum),
            // Zero checks is reported as `conclusion: "none"`, never "passed"
            // (issue #1077). Other failures carry no conclusion at all.
            ...(errorType === "no-checks" ? { conclusion: "none" as const } : {}),
            errorType,
            errorMessage:
              combined ||
              (errorType === "no-checks"
                ? "no checks reported on this pull request"
                : "gh pr checks failed"),
          },
          result.stdout,
          formatPrChecks,
          compactPrChecksMap,
          formatPrChecksCompact,
          compact === false,
        );
      }

      let data: PrChecksResult;
      try {
        data = parsePrChecks(result.stdout, prNum);
        data.conclusion = deriveConclusion(data);
      } catch {
        const combined = `${result.stdout}\n${result.stderr}`.trim();
        return compactDualOutput(
          {
            ...emptySnapshot(prNum),
            errorType: "unknown" as const,
            errorMessage: combined || "Failed to parse pr checks output",
          },
          result.stdout,
          formatPrChecks,
          compactPrChecksMap,
          formatPrChecksCompact,
          compact === false,
        );
      }
      return compactDualOutput(
        data,
        result.stdout,
        formatPrChecks,
        compactPrChecksMap,
        formatPrChecksCompact,
        compact === false,
      );
    },
  );
}
