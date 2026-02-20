import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { compactDualOutput, compactInput, projectPathInput } from "@paretools/shared";
import { bunCmd } from "../lib/bun-runner.js";
import { parseOutdatedOutput } from "../lib/parsers.js";
import { formatOutdated, compactOutdatedMap, formatOutdatedCompact } from "../lib/formatters.js";
import { BunOutdatedResultSchema } from "../schemas/index.js";

/** Registers the `outdated` tool on the given MCP server. */
export function registerOutdatedTool(server: McpServer) {
  server.registerTool(
    "outdated",
    {
      title: "Bun Outdated",
      description:
        "Runs `bun outdated` to check for outdated packages and returns structured version info.",
      inputSchema: {
        path: projectPathInput,
        compact: compactInput,
      },
      outputSchema: BunOutdatedResultSchema,
    },
    async ({ path, compact }) => {
      const cwd = path || process.cwd();

      const cmdArgs = ["outdated"];

      const start = Date.now();
      let result: { exitCode: number; stdout: string; stderr: string };

      try {
        result = await bunCmd(cmdArgs, cwd);
      } catch (err: unknown) {
        const errMsg = err instanceof Error ? err.message : String(err);
        if (errMsg.includes("timed out")) {
          result = { exitCode: 124, stdout: "", stderr: errMsg };
        } else {
          throw err;
        }
      }
      const duration = Date.now() - start;

      const data = parseOutdatedOutput(result.stdout, result.stderr, result.exitCode, duration);
      const rawOutput = (result.stdout + "\n" + result.stderr).trim();
      return compactDualOutput(
        data,
        rawOutput,
        formatOutdated,
        compactOutdatedMap,
        formatOutdatedCompact,
        compact === false,
      );
    },
  );
}
