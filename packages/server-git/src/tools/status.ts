import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { dualOutput } from "@paretools/shared";
import { git } from "../lib/git-runner.js";
import { parseStatus } from "../lib/parsers.js";
import { formatStatus } from "../lib/formatters.js";
import { GitStatusSchema } from "../schemas/index.js";

export function registerStatusTool(server: McpServer) {
  server.registerTool(
    "status",
    {
      title: "Git Status",
      description:
        "Returns the working tree status as structured data (branch, staged, modified, untracked, conflicts). Use instead of running `git status` in the terminal.",
      inputSchema: {
        path: z.string().optional().describe("Repository path (default: cwd)"),
      },
      outputSchema: GitStatusSchema,
    },
    async ({ path }) => {
      const cwd = path || process.cwd();
      const result = await git(["status", "--porcelain=v1", "--branch"], cwd);

      if (result.exitCode !== 0) {
        throw new Error(`git status failed: ${result.stderr}`);
      }

      const lines = result.stdout.split("\n").filter(Boolean);
      const branchLine = lines.find((l) => l.startsWith("## ")) ?? "## unknown";
      const fileLines = lines.filter((l) => !l.startsWith("## ")).join("\n");

      const status = parseStatus(fileLines, branchLine);
      return dualOutput(status, formatStatus);
    },
  );
}
