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
        "Binary search for the commit that introduced a bug. Supports start, good, bad, reset, and status actions. Returns structured data with action taken, current commit, remaining steps estimate, and result when the culprit is found. Use instead of running `git bisect` in the terminal.",
      inputSchema: {
        path: z
          .string()
          .max(INPUT_LIMITS.PATH_MAX)
          .optional()
          .describe("Repository path (default: cwd)"),
        action: z
          .enum(["start", "good", "bad", "reset", "status"])
          .describe("Bisect action to perform"),
        bad: z
          .string()
          .max(INPUT_LIMITS.SHORT_STRING_MAX)
          .optional()
          .describe("Bad commit ref (used with start action)"),
        good: z
          .string()
          .max(INPUT_LIMITS.SHORT_STRING_MAX)
          .optional()
          .describe("Good commit ref (used with start action)"),
      },
      outputSchema: GitBisectSchema,
    },
    async (params) => {
      const cwd = params.path || process.cwd();
      const action = params.action;

      if (action === "start") {
        const bad = params.bad;
        const good = params.good;

        if (!bad || !good) {
          throw new Error("Both 'bad' and 'good' commit refs are required for bisect start");
        }

        assertNoFlagInjection(bad, "bad");
        assertNoFlagInjection(good, "good");

        // Start bisect session
        const startResult = await git(["bisect", "start"], cwd);
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

        // Mark the good commit — this triggers the first bisect step
        const goodResult = await git(["bisect", "good", good], cwd);
        if (goodResult.exitCode !== 0) {
          await git(["bisect", "reset"], cwd);
          throw new Error(`git bisect good failed: ${goodResult.stderr}`);
        }

        const bisectResult = parseBisect(goodResult.stdout, goodResult.stderr, "start");
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
