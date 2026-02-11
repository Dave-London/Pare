import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { compactDualOutput } from "@paretools/shared";
import { assertNoFlagInjection } from "@paretools/shared";
import { git } from "../lib/git-runner.js";
import { parseLog } from "../lib/parsers.js";
import { formatLog, compactLogMap, formatLogCompact } from "../lib/formatters.js";
import { GitLogSchema } from "../schemas/index.js";

const DELIMITER = "@@";
const LOG_FORMAT = `%H${DELIMITER}%h${DELIMITER}%an${DELIMITER}%ae${DELIMITER}%ar${DELIMITER}%D${DELIMITER}%s`;

export function registerLogTool(server: McpServer) {
  server.registerTool(
    "log",
    {
      title: "Git Log",
      description:
        "Returns commit history as structured data. Use instead of running `git log` in the terminal.",
      inputSchema: {
        path: z.string().optional().describe("Repository path (default: cwd)"),
        maxCount: z
          .number()
          .optional()
          .default(10)
          .describe("Number of commits to return (default: 10)"),
        ref: z.string().optional().describe("Branch, tag, or commit to start from"),
        author: z.string().optional().describe("Filter by author name or email"),
        compact: z
          .boolean()
          .optional()
          .default(true)
          .describe(
            "Auto-compact when structured output exceeds raw CLI tokens. Set false to always get full schema.",
          ),
      },
      outputSchema: GitLogSchema,
    },
    async ({ path, maxCount, ref, author, compact }) => {
      const cwd = path || process.cwd();
      const args = ["log", `--format=${LOG_FORMAT}`, `--max-count=${maxCount ?? 10}`];

      if (author) args.push(`--author=${author}`);
      if (ref) {
        assertNoFlagInjection(ref, "ref");
        args.push(ref);
      }

      const result = await git(args, cwd);

      if (result.exitCode !== 0) {
        throw new Error(`git log failed: ${result.stderr}`);
      }

      const log = parseLog(result.stdout);
      return compactDualOutput(
        log,
        result.stdout,
        formatLog,
        compactLogMap,
        formatLogCompact,
        compact === false,
      );
    },
  );
}
