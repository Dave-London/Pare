import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { compactDualOutput, INPUT_LIMITS } from "@paretools/shared";
import { ghCmd } from "../lib/gh-runner.js";
import { parseRunView } from "../lib/parsers.js";
import { formatRunView, compactRunViewMap, formatRunViewCompact } from "../lib/formatters.js";
import { RunViewResultSchema } from "../schemas/index.js";

const RUN_VIEW_FIELDS =
  "databaseId,status,conclusion,name,workflowName,headBranch,jobs,url,createdAt";

export function registerRunViewTool(server: McpServer) {
  server.registerTool(
    "run-view",
    {
      title: "Run View",
      description:
        "Views a workflow run by ID. Returns structured data with status, conclusion, jobs, and workflow details.",
      inputSchema: {
        id: z.number().describe("Workflow run ID"),
        path: z
          .string()
          .max(INPUT_LIMITS.PATH_MAX)
          .optional()
          .describe("Repository path (default: cwd)"),
        compact: z
          .boolean()
          .optional()
          .default(true)
          .describe(
            "Prefer compact output",
          ),
      },
      outputSchema: RunViewResultSchema,
    },
    async ({ id, path, compact }) => {
      const cwd = path || process.cwd();

      const args = ["run", "view", String(id), "--json", RUN_VIEW_FIELDS];
      const result = await ghCmd(args, cwd);

      if (result.exitCode !== 0) {
        throw new Error(`gh run view failed: ${result.stderr}`);
      }

      const data = parseRunView(result.stdout);
      return compactDualOutput(
        data,
        result.stdout,
        formatRunView,
        compactRunViewMap,
        formatRunViewCompact,
        compact === false,
      );
    },
  );
}
