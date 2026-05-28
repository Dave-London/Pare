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
import { parsePrChecks } from "../lib/parsers.js";
import { formatPrChecks, compactPrChecksMap, formatPrChecksCompact } from "../lib/formatters.js";
import { PrChecksResultSchema, type PrChecksResult } from "../schemas/index.js";

const PR_CHECKS_FIELDS = "name,state,bucket,description,event,workflow,link,startedAt,completedAt";

const DEFAULT_INTERVAL_SECONDS = 10;
const MIN_INTERVAL_SECONDS = 5;
const MAX_INTERVAL_SECONDS = 300;
const DEFAULT_WATCH_TIMEOUT_SECONDS = 600;
const MAX_WATCH_TIMEOUT_SECONDS = 3600;

function classifyPrChecksError(
  stderr: string,
): "not-found" | "permission-denied" | "in-progress" | "unknown" {
  const lower = stderr.toLowerCase();
  if (/not found|could not resolve|no pull request/.test(lower)) return "not-found";
  if (/forbidden|permission|403/.test(lower)) return "permission-denied";
  if (/pending|in progress|checks are still running/.test(lower)) return "in-progress";
  return "unknown";
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

/** Sleeps for `ms` milliseconds. Exposed via parameter for testability. */
function defaultSleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Internal watch loop — polls `gh pr checks --json ...` every `intervalMs`
 * until all checks are non-pending or `timeoutMs` elapses.
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
}

export interface WatchResult {
  data: PrChecksResult;
  pollCount: number;
  waitedSeconds: number;
  timedOut: boolean;
  pending: string[];
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
  let pollCount = 0;
  let lastData: PrChecksResult = {
    pr: prNum,
    checks: [],
    summary: { total: 0, passed: 0, failed: 0, pending: 0, skipped: 0, cancelled: 0 },
  };

  while (true) {
    pollCount++;
    const result = await ghCmd(args, cwd);

    // Exit code 8 means checks are still pending — gh still emits valid JSON.
    if (result.exitCode !== 0 && result.exitCode !== 8) {
      const combined = `${result.stdout}\n${result.stderr}`.trim();
      lastData = {
        pr: prNum,
        checks: [],
        summary: { total: 0, passed: 0, failed: 0, pending: 0, skipped: 0, cancelled: 0 },
        errorType: classifyPrChecksError(combined),
        errorMessage: combined || "gh pr checks failed",
      };
      const elapsed = (now() - start) / 1000;
      return {
        data: lastData,
        pollCount,
        waitedSeconds: elapsed,
        timedOut: false,
        pending: [],
      };
    }

    try {
      lastData = parsePrChecks(result.stdout, prNum);
    } catch {
      const combined = `${result.stdout}\n${result.stderr}`.trim();
      lastData = {
        pr: prNum,
        checks: [],
        summary: { total: 0, passed: 0, failed: 0, pending: 0, skipped: 0, cancelled: 0 },
        errorType: "unknown",
        errorMessage: combined || "Failed to parse pr checks output",
      };
      const elapsed = (now() - start) / 1000;
      return {
        data: lastData,
        pollCount,
        waitedSeconds: elapsed,
        timedOut: false,
        pending: [],
      };
    }

    if (allChecksComplete(lastData)) {
      const elapsed = (now() - start) / 1000;
      return {
        data: lastData,
        pollCount,
        waitedSeconds: elapsed,
        timedOut: false,
        pending: [],
      };
    }

    const elapsed = now() - start;
    if (elapsed + opts.intervalMs > opts.timeoutMs) {
      return {
        data: lastData,
        pollCount,
        waitedSeconds: elapsed / 1000,
        timedOut: true,
        pending: pendingCheckNames(lastData),
      };
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
        "Lists check/status results for a pull request. Returns structured data with check names, states, URLs, and summary counts (passed, failed, pending). When watch=true, polls internally until all checks complete (or timeout).",
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
            "Poll checks internally until all are non-pending. The wrapper polls gh JSON output (gh's native --watch is incompatible with --json).",
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
      const prNum = typeof number === "number" ? number : 0;

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
          throw new Error(
            `pr-checks watch timed out after ${timeoutSeconds}s — checks still pending: ${watchResult.pending.join(", ") || "(none reported)"}`,
          );
        }

        const data: PrChecksResult = {
          ...watchResult.data,
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
        return compactDualOutput(
          {
            pr: prNum,
            checks: [],
            summary: { total: 0, passed: 0, failed: 0, pending: 0, skipped: 0, cancelled: 0 },
            errorType: classifyPrChecksError(combined),
            errorMessage: combined || "gh pr checks failed",
          },
          result.stdout,
          formatPrChecks,
          compactPrChecksMap,
          formatPrChecksCompact,
          compact === false,
        );
      }

      let data;
      try {
        data = parsePrChecks(result.stdout, prNum);
      } catch {
        const combined = `${result.stdout}\n${result.stderr}`.trim();
        return compactDualOutput(
          {
            pr: prNum,
            checks: [],
            summary: { total: 0, passed: 0, failed: 0, pending: 0, skipped: 0, cancelled: 0 },
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
