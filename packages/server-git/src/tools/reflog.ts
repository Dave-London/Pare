import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { compactDualOutput, INPUT_LIMITS } from "@paretools/shared";
import { assertNoFlagInjection } from "@paretools/shared";
import { git } from "../lib/git-runner.js";
import { parseReflogOutput } from "../lib/parsers.js";
import { formatReflog, compactReflogMap, formatReflogCompact } from "../lib/formatters.js";
import { GitReflogSchema } from "../schemas/index.js";

const REFLOG_FORMAT = "%H\t%h\t%gd\t%gs\t%ci";

export function registerReflogTool(server: McpServer) {
  server.registerTool(
    "reflog",
    {
      title: "Git Reflog",
      description:
        "Returns reference log entries as structured data, useful for recovery operations. Use instead of running `git reflog` in the terminal.",
      inputSchema: {
        path: z
          .string()
          .max(INPUT_LIMITS.PATH_MAX)
          .optional()
          .describe("Repository path (default: cwd)"),
        maxCount: z
          .number()
          .optional()
          .default(20)
          .describe("Number of entries to return (default: 20)"),
        ref: z
          .string()
          .max(INPUT_LIMITS.SHORT_STRING_MAX)
          .optional()
          .describe("Which ref to show (default: HEAD)"),
        compact: z
          .boolean()
          .optional()
          .default(true)
          .describe(
            "Prefer compact output",
          ),
      },
      outputSchema: GitReflogSchema,
    },
    async ({ path, maxCount, ref, compact }) => {
      const cwd = path || process.cwd();
      const args = ["reflog", "show", `--format=${REFLOG_FORMAT}`, `--max-count=${maxCount ?? 20}`];

      if (ref) {
        assertNoFlagInjection(ref, "ref");
        args.push(ref);
      }

      const result = await git(args, cwd);

      if (result.exitCode !== 0) {
        throw new Error(`git reflog failed: ${result.stderr}`);
      }

      const reflog = parseReflogOutput(result.stdout);
      return compactDualOutput(
        reflog,
        result.stdout,
        formatReflog,
        compactReflogMap,
        formatReflogCompact,
        compact === false,
      );
    },
  );
}
