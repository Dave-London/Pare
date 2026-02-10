import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { dualOutput } from "@paretools/shared";
import { black } from "../lib/python-runner.js";
import { parseBlackOutput } from "../lib/parsers.js";
import { formatBlack } from "../lib/formatters.js";
import { BlackResultSchema } from "../schemas/index.js";

export function registerBlackTool(server: McpServer) {
  server.registerTool(
    "black",
    {
      title: "Black Formatter",
      description:
        "Runs Black code formatter and returns structured results (files changed, unchanged, would reformat). Use instead of running `black` in the terminal.",
      inputSchema: {
        path: z.string().optional().describe("Project root path (default: cwd)"),
        targets: z
          .array(z.string())
          .optional()
          .default(["."])
          .describe('Files or directories to format (default: ["."])'),
        check: z
          .boolean()
          .optional()
          .default(false)
          .describe("Check mode (report without modifying files)"),
      },
      outputSchema: BlackResultSchema,
    },
    async ({ path, targets, check }) => {
      const cwd = path || process.cwd();
      const args = [...(targets || ["."])];
      if (check) args.push("--check");

      const result = await black(args, cwd);
      const data = parseBlackOutput(result.stdout, result.stderr, result.exitCode);
      return dualOutput(data, formatBlack);
    },
  );
}
