import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { dualOutput, assertNoFlagInjection, INPUT_LIMITS, repoPathInput } from "@paretools/shared";
import { git } from "../lib/git-runner.js";
import { parseStashOutput, parseStashError } from "../lib/parsers.js";
import { formatStash } from "../lib/formatters.js";
import { GitStashSchema } from "../schemas/index.js";

/** Registers the `stash` tool on the given MCP server. */
export function registerStashTool(server: McpServer) {
  server.registerTool(
    "stash",
    {
      title: "Git Stash",
      description:
        "Pushes, pops, applies, drops, shows, or clears stash entries. Returns structured result with action, success, message, and stash reference.",
      inputSchema: {
        path: repoPathInput,
        action: z
          .enum(["push", "pop", "apply", "drop", "clear", "show", "branch"])
          .describe("Stash action to perform"),
        message: z
          .string()
          .max(INPUT_LIMITS.MESSAGE_MAX)
          .optional()
          .describe("Stash message (only used with push action)"),
        index: z
          .number()
          .optional()
          .describe("Stash index for pop/apply/drop/show (e.g., 0 for stash@{0})"),
        includeUntracked: z
          .boolean()
          .optional()
          .describe("Stash untracked files (-u/--include-untracked)"),
        staged: z.boolean().optional().describe("Stash only staged changes (--staged)"),
        keepIndex: z.boolean().optional().describe("Keep staged changes in index (--keep-index)"),
        pathspec: z
          .array(z.string().max(INPUT_LIMITS.PATH_MAX))
          .max(INPUT_LIMITS.ARRAY_MAX)
          .optional()
          .describe("Stash specific files (-- <pathspec>)"),
        all: z.boolean().optional().describe("Include ignored files (-a/--all)"),
        reinstateIndex: z
          .boolean()
          .optional()
          .describe("Reinstate staged changes on apply (--index)"),
        patch: z
          .boolean()
          .optional()
          .describe("Include full diff patch in show output (-p/--patch)"),
        branchName: z
          .string()
          .max(INPUT_LIMITS.SHORT_STRING_MAX)
          .optional()
          .describe("Branch name used with action=branch (`git stash branch <name>`)"),
      },
      outputSchema: GitStashSchema,
    },
    async ({
      path,
      action,
      message,
      index,
      includeUntracked,
      staged,
      keepIndex,
      pathspec,
      all,
      reinstateIndex,
      patch,
      branchName,
    }) => {
      const cwd = path || process.cwd();
      const args = ["stash"];

      if (action === "clear") {
        args.push("clear");
        const result = await git(args, cwd);
        if (result.exitCode !== 0) {
          const stashResult = parseStashError(result.stdout, result.stderr, "clear");
          return dualOutput(stashResult, formatStash);
        }
        const stashResult = parseStashOutput(result.stdout, result.stderr, "clear");
        return dualOutput(stashResult, formatStash);
      }

      // Gap #139: stash show
      if (action === "show") {
        const showArgs = ["stash", "show", "--stat"];
        if (patch) showArgs.push("--patch");
        if (index !== undefined) {
          showArgs.push(`stash@{${index}}`);
        }

        const result = await git(showArgs, cwd);
        if (result.exitCode !== 0) {
          const stashResult = parseStashError(result.stdout, result.stderr, "show");
          return dualOutput(stashResult, formatStash);
        }
        const stashResult = parseStashOutput(result.stdout, result.stderr, "show");
        return dualOutput(stashResult, formatStash);
      }

      if (action === "push") {
        args.push("push");
        if (includeUntracked) args.push("--include-untracked");
        if (staged) args.push("--staged");
        if (keepIndex) args.push("--keep-index");
        if (all) args.push("--all");
        if (message) {
          assertNoFlagInjection(message, "stash message");
          args.push("-m", message);
        }
        if (pathspec && pathspec.length > 0) {
          for (const p of pathspec) {
            assertNoFlagInjection(p, "pathspec");
          }
          args.push("--", ...pathspec);
        }
      } else {
        if (action === "branch") {
          if (!branchName) {
            throw new Error("branchName is required when action=branch");
          }
          assertNoFlagInjection(branchName, "branchName");
          args.push("branch", branchName);
        } else {
          args.push(action);
        }
        if ((action === "pop" || action === "apply") && reinstateIndex) {
          args.push("--index");
        }
        if (index !== undefined) {
          args.push(`stash@{${index}}`);
        }
      }

      const result = await git(args, cwd);

      if (result.exitCode !== 0) {
        const stashResult = parseStashError(result.stdout, result.stderr, action);
        return dualOutput(stashResult, formatStash);
      }

      const stashResult = parseStashOutput(result.stdout, result.stderr, action);
      if (action === "branch" && branchName) {
        stashResult.branchName = branchName;
      }
      return dualOutput(stashResult, formatStash);
    },
  );
}
