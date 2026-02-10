import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { dualOutput } from "@paretools/shared";
import { npm } from "../lib/npm-runner.js";
import { parseListJson } from "../lib/parsers.js";
import { formatList } from "../lib/formatters.js";
import { NpmListSchema } from "../schemas/index.js";

export function registerListTool(server: McpServer) {
  server.registerTool(
    "list",
    {
      title: "npm List",
      description: "Lists installed packages as structured dependency data",
      inputSchema: {
        path: z.string().optional().describe("Project root path (default: cwd)"),
        depth: z
          .number()
          .optional()
          .default(0)
          .describe("Dependency tree depth (default: 0, top-level only)"),
      },
      outputSchema: NpmListSchema,
    },
    async ({ path, depth }) => {
      const cwd = path || process.cwd();
      const result = await npm(["ls", "--json", `--depth=${depth ?? 0}`], cwd);

      if (result.exitCode !== 0 && !result.stdout) {
        throw new Error(`npm ls failed: ${result.stderr}`);
      }

      const list = parseListJson(result.stdout);
      return dualOutput(list, formatList);
    },
  );
}
