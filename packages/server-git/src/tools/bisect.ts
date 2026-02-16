import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { dualOutput, assertNoFlagInjection, INPUT_LIMITS } from "@paretools/shared";
import { git } from "../lib/git-runner.js";
import { parseBisect } from "../lib/parsers.js";
import { formatBisect } from "../lib/formatters.js";
import { GitBisectSchema } from "../schemas/index.js";

/** Registers the `bisect` tool on the given MCP server. */
export function registerBisectTool(server: McpServer) {
  server.registerTool(
    "bisect",
    {
      title: "Git Bisect",
      description:
        "Binary search for the commit that introduced a bug. Supports start, good, bad, reset, status, and skip actions. Returns structured data with action taken, current commit, remaining steps estimate, and result when the culprit is found. Use instead of running `git bisect` in the terminal.",
      inputSchema: {
        path: z
          .string()
          .max(INPUT_LIMITS.PATH_MAX)
          .optional()
          .describe("Repository path (default: cwd)"),
        action: z
          .enum(["start", "good", "bad", "reset", "status", "skip"])
          .describe("Bisect action to perform"),
        bad: z
          .string()
          .max(INPUT_LIMITS.SHORT_STRING_MAX)
          .optional()
          .describe("Bad commit ref (used with start action)"),
        good: z
          .union([
            z.string().max(INPUT_LIMITS.SHORT_STRING_MAX),
            z.array(z.string().max(INPUT_LIMITS.SHORT_STRING_MAX)).max(INPUT_LIMITS.ARRAY_MAX),
          ])
          .optional()
          .describe(
            "Good commit ref(s) — single string or array of refs to narrow the search range (used with start action)",
          ),
        paths: z
          .array(z.string().max(INPUT_LIMITS.PATH_MAX))
          .max(INPUT_LIMITS.ARRAY_MAX)
          .optional()
          .describe("Restrict bisection to changes affecting specific paths (-- <paths>)"),
        noCheckout: z
          .boolean()
          .optional()
          .describe("Perform bisection without checking out each commit (--no-checkout)"),
        firstParent: z
          .boolean()
          .optional()
          .describe("Follow only first parent on merge commits (--first-parent)"),
        termOld: z
          .string()
          .max(INPUT_LIMITS.SHORT_STRING_MAX)
          .optional()
          .describe("Custom term for the old/good state (--term-old)"),
        termNew: z
          .string()
          .max(INPUT_LIMITS.SHORT_STRING_MAX)
          .optional()
          .describe("Custom term for the new/bad state (--term-new)"),
      },
      outputSchema: GitBisectSchema,
    },
    async (params) => {
      const cwd = params.path || process.cwd();
      const action = params.action;

      if (action === "start") {
        const bad = params.bad;
        const goodParam = params.good;

        if (!bad || !goodParam) {
          throw new Error("Both 'bad' and 'good' commit refs are required for bisect start");
        }

        assertNoFlagInjection(bad, "bad");
        const goodRefs = Array.isArray(goodParam) ? goodParam : [goodParam];
        for (const g of goodRefs) {
          assertNoFlagInjection(g, "good");
        }
        if (params.termOld) assertNoFlagInjection(params.termOld, "termOld");
        if (params.termNew) assertNoFlagInjection(params.termNew, "termNew");
        if (params.paths) {
          for (const p of params.paths) {
            assertNoFlagInjection(p, "paths");
          }
        }

        // Start bisect session
        const startArgs = ["bisect", "start"];
        if (params.noCheckout) startArgs.push("--no-checkout");
        if (params.firstParent) startArgs.push("--first-parent");
        if (params.termOld) startArgs.push(`--term-old=${params.termOld}`);
        if (params.termNew) startArgs.push(`--term-new=${params.termNew}`);
        // Append paths restriction
        if (params.paths && params.paths.length > 0) {
          startArgs.push("--", ...params.paths);
        }
        const startResult = await git(startArgs, cwd);
        if (startResult.exitCode !== 0) {
          throw new Error(`git bisect start failed: ${startResult.stderr}`);
        }

        // Mark the bad commit
        const badResult = await git(["bisect", "bad", bad], cwd);
        if (badResult.exitCode !== 0) {
          // Reset bisect on failure
          await git(["bisect", "reset"], cwd);
          throw new Error(`git bisect bad failed: ${badResult.stderr}`);
        }

        // Mark good commit(s) — last one triggers the first bisect step
        let lastGoodResult = badResult;
        for (const goodRef of goodRefs) {
          lastGoodResult = await git(["bisect", "good", goodRef], cwd);
          if (lastGoodResult.exitCode !== 0) {
            await git(["bisect", "reset"], cwd);
            throw new Error(`git bisect good failed: ${lastGoodResult.stderr}`);
          }
        }

        const bisectResult = parseBisect(lastGoodResult.stdout, lastGoodResult.stderr, "start");
        return dualOutput(bisectResult, formatBisect);
      }

      if (action === "good") {
        const result = await git(["bisect", "good"], cwd);
        if (result.exitCode !== 0) {
          throw new Error(`git bisect good failed: ${result.stderr}`);
        }

        const bisectResult = parseBisect(result.stdout, result.stderr, "good");
        return dualOutput(bisectResult, formatBisect);
      }

      if (action === "bad") {
        const result = await git(["bisect", "bad"], cwd);
        if (result.exitCode !== 0) {
          throw new Error(`git bisect bad failed: ${result.stderr}`);
        }

        const bisectResult = parseBisect(result.stdout, result.stderr, "bad");
        return dualOutput(bisectResult, formatBisect);
      }

      if (action === "skip") {
        const result = await git(["bisect", "skip"], cwd);
        if (result.exitCode !== 0) {
          throw new Error(`git bisect skip failed: ${result.stderr}`);
        }

        const bisectResult = parseBisect(result.stdout, result.stderr, "skip");
        return dualOutput(bisectResult, formatBisect);
      }

      if (action === "reset") {
        const result = await git(["bisect", "reset"], cwd);
        if (result.exitCode !== 0) {
          throw new Error(`git bisect reset failed: ${result.stderr}`);
        }

        const bisectResult = parseBisect(result.stdout, result.stderr, "reset");
        return dualOutput(bisectResult, formatBisect);
      }

      // status
      const result = await git(["bisect", "log"], cwd);
      if (result.exitCode !== 0) {
        throw new Error(`git bisect log failed: ${result.stderr}`);
      }

      const bisectResult = parseBisect(result.stdout, result.stderr, "status");
      return dualOutput(bisectResult, formatBisect);
    },
  );
}
