import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { dualOutput } from "@paretools/shared";
import { git } from "../lib/git-runner.js";
import { parseLog } from "../lib/parsers.js";
import { formatLog } from "../lib/formatters.js";
import { GitLogSchema } from "../schemas/index.js";

const DELIMITER = "\x1f";
const LOG_FORMAT = `%H${DELIMITER}%h${DELIMITER}%an${DELIMITER}%ae${DELIMITER}%ar${DELIMITER}%D${DELIMITER}%s`;

export function registerLogTool(server: McpServer) {
  server.registerTool(
    "log",
    {
      title: "Git Log",
      description: "Returns commit history as structured data",
      inputSchema: {
        path: z.string().optional().describe("Repository path (default: cwd)"),
        maxCount: z
          .number()
          .optional()
          .default(10)
          .describe("Number of commits to return (default: 10)"),
        ref: z.string().optional().describe("Branch, tag, or commit to start from"),
        author: z.string().optional().describe("Filter by author name or email"),
      },
      outputSchema: GitLogSchema,
    },
    async ({ path, maxCount, ref, author }) => {
      const cwd = path || process.cwd();
      const args = ["log", `--format=${LOG_FORMAT}`, `--max-count=${maxCount ?? 10}`];

      if (author) args.push(`--author=${author}`);
      if (ref) args.push(ref);

      const result = await git(args, cwd);

      if (result.exitCode !== 0) {
        throw new Error(`git log failed: ${result.stderr}`);
      }

      const log = parseLog(result.stdout);
      return dualOutput(log, formatLog);
    },
  );
}
