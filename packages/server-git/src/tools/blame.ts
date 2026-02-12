import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { compactDualOutput, assertNoFlagInjection, INPUT_LIMITS } from "@paretools/shared";
import { git } from "../lib/git-runner.js";
import { parseBlameOutput } from "../lib/parsers.js";
import { formatBlame, compactBlameMap, formatBlameCompact } from "../lib/formatters.js";
import { GitBlameSchema } from "../schemas/index.js";

export function registerBlameTool(server: McpServer) {
  server.registerTool(
    "blame",
    {
      title: "Git Blame",
      description:
        "Shows per-line commit annotations for a file. Returns structured blame data with hash, author, date, line number, and content. Use instead of running `git blame` in the terminal.",
      inputSchema: {
        path: z
          .string()
          .max(INPUT_LIMITS.PATH_MAX)
          .optional()
          .describe("Repository path (default: cwd)"),
        file: z.string().max(INPUT_LIMITS.PATH_MAX).describe("File path to blame"),
        startLine: z.number().optional().describe("Start line number for blame range"),
        endLine: z.number().optional().describe("End line number for blame range"),
        compact: z
          .boolean()
          .optional()
          .default(true)
          .describe(
            "Auto-compact when structured output exceeds raw CLI tokens. Set false to always get full schema.",
          ),
      },
      outputSchema: GitBlameSchema,
    },
    async ({ path, file, startLine, endLine, compact }) => {
      const cwd = path || process.cwd();

      assertNoFlagInjection(file, "file");

      const args = ["blame", "--porcelain"];
      if (startLine !== undefined && endLine !== undefined) {
        args.push(`-L${startLine},${endLine}`);
      } else if (startLine !== undefined) {
        args.push(`-L${startLine},`);
      }
      args.push("--", file);

      const result = await git(args, cwd);

      if (result.exitCode !== 0) {
        throw new Error(`git blame failed: ${result.stderr}`);
      }

      const blame = parseBlameOutput(result.stdout, file);
      return compactDualOutput(
        blame,
        result.stdout,
        formatBlame,
        compactBlameMap,
        formatBlameCompact,
        compact === false,
      );
    },
  );
}
