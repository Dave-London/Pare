import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { compactDualOutput, compactInput, projectPathInput } from "@paretools/shared";
import { bundleCmd } from "../lib/ruby-runner.js";
import { parseBundleCheckOutput } from "../lib/parsers.js";
import {
  formatBundleCheck,
  compactBundleCheckMap,
  formatBundleCheckCompact,
} from "../lib/formatters.js";
import { BundleCheckResultSchema } from "../schemas/index.js";

/** Registers the `bundle-check` tool on the given MCP server. */
export function registerBundleCheckTool(server: McpServer) {
  server.registerTool(
    "bundle-check",
    {
      title: "Bundle Check",
      description:
        "Verifies that the Gemfile's dependencies are satisfied without installing them.",
      inputSchema: {
        path: projectPathInput,
        compact: compactInput,
      },
      outputSchema: BundleCheckResultSchema,
    },
    async ({ path, compact }) => {
      const cwd = path || process.cwd();
      const result = await bundleCmd(["check"], cwd);

      const data = parseBundleCheckOutput(result.stdout, result.stderr, result.exitCode);
      const rawOutput = (result.stdout + "\n" + result.stderr).trim();
      return compactDualOutput(
        data,
        rawOutput,
        formatBundleCheck,
        compactBundleCheckMap,
        formatBundleCheckCompact,
        compact === false,
      );
    },
  );
}
