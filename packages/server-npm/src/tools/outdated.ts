import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { dualOutput } from "@paretools/shared";
import { npm } from "../lib/npm-runner.js";
import { parseOutdatedJson } from "../lib/parsers.js";
import { formatOutdated } from "../lib/formatters.js";
import { NpmOutdatedSchema } from "../schemas/index.js";

export function registerOutdatedTool(server: McpServer) {
  server.registerTool(
    "outdated",
    {
      title: "npm Outdated",
      description:
        "Checks for outdated packages and returns structured update information. Use instead of running `npm outdated` in the terminal.",
      inputSchema: {
        path: z.string().optional().describe("Project root path (default: cwd)"),
      },
      outputSchema: NpmOutdatedSchema,
    },
    async ({ path }) => {
      const cwd = path || process.cwd();
      const result = await npm(["outdated", "--json"], cwd);

      // npm outdated returns exit code 1 when outdated packages exist, which is expected
      const output = result.stdout || "{}";
      const outdated = parseOutdatedJson(output);
      return dualOutput(outdated, formatOutdated);
    },
  );
}
