import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { dualOutput, assertNoFlagInjection, INPUT_LIMITS } from "@paretools/shared";
import { git } from "../lib/git-runner.js";
import { parseCommit } from "../lib/parsers.js";
import { formatCommit } from "../lib/formatters.js";
import { GitCommitSchema } from "../schemas/index.js";

export function registerCommitTool(server: McpServer) {
  server.registerTool(
    "commit",
    {
      title: "Git Commit",
      description:
        "Creates a commit with the given message. Returns structured data with hash, message, and change statistics.",
      inputSchema: {
        path: z
          .string()
          .max(INPUT_LIMITS.PATH_MAX)
          .optional()
          .describe("Repository path (default: cwd)"),
        message: z.string().max(INPUT_LIMITS.MESSAGE_MAX).describe("Commit message"),
        amend: z.boolean().optional().default(false).describe("Amend the previous commit"),
      },
      outputSchema: GitCommitSchema,
    },
    async ({ path, message, amend }) => {
      const cwd = path || process.cwd();

      assertNoFlagInjection(message, "commit message");

      // Use --file - to pipe the message via stdin instead of -m.
      // This avoids cmd.exe argument escaping issues on Windows where
      // newlines, parentheses, and special characters in the message
      // break the command line. Works identically on all platforms.
      const args = ["commit"];
      if (amend) args.push("--amend");
      args.push("--file", "-");

      const result = await git(args, cwd, { stdin: message });

      if (result.exitCode !== 0) {
        throw new Error(`git commit failed: ${result.stderr}`);
      }

      const commitResult = parseCommit(result.stdout);
      return dualOutput(commitResult, formatCommit);
    },
  );
}
