import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { dualOutput, assertNoFlagInjection, INPUT_LIMITS } from "@paretools/shared";
import { git } from "../lib/git-runner.js";
import { parseStashOutput } from "../lib/parsers.js";
import { formatStash } from "../lib/formatters.js";
import { GitStashSchema } from "../schemas/index.js";

export function registerStashTool(server: McpServer) {
  server.registerTool(
    "stash",
    {
      title: "Git Stash",
      description:
        "Pushes, pops, applies, or drops stash entries. Returns structured result with action, success, and message.",
      inputSchema: {
        path: z
          .string()
          .max(INPUT_LIMITS.PATH_MAX)
          .optional()
          .describe("Repository path (default: cwd)"),
        action: z.enum(["push", "pop", "apply", "drop"]).describe("Stash action to perform"),
        message: z
          .string()
          .max(INPUT_LIMITS.MESSAGE_MAX)
          .optional()
          .describe("Stash message (only used with push action)"),
        index: z
          .number()
          .optional()
          .describe("Stash index for pop/apply/drop (e.g., 0 for stash@{0})"),
      },
      outputSchema: GitStashSchema,
    },
    async ({ path, action, message, index }) => {
      const cwd = path || process.cwd();
      const args = ["stash"];

      if (action === "push") {
        args.push("push");
        if (message) {
          assertNoFlagInjection(message, "stash message");
          args.push("-m", message);
        }
      } else {
        args.push(action);
        if (index !== undefined) {
          args.push(`stash@{${index}}`);
        }
      }

      const result = await git(args, cwd);

      if (result.exitCode !== 0) {
        throw new Error(`git stash ${action} failed: ${result.stderr}`);
      }

      const stashResult = parseStashOutput(result.stdout, result.stderr, action);
      return dualOutput(stashResult, formatStash);
    },
  );
}
