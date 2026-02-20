import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { compactDualOutput, compactInput, projectPathInput } from "@paretools/shared";
import { bundleCmd } from "../lib/ruby-runner.js";
import { parseBundleInstallOutput } from "../lib/parsers.js";
import {
  formatBundleInstall,
  compactBundleInstallMap,
  formatBundleInstallCompact,
} from "../lib/formatters.js";
import { BundleInstallResultSchema } from "../schemas/index.js";

/** Registers the `bundle-install` tool on the given MCP server. */
export function registerBundleInstallTool(server: McpServer) {
  server.registerTool(
    "bundle-install",
    {
      title: "Bundle Install",
      description:
        "Installs Gemfile dependencies using `bundle install` and returns structured output with success status and duration.",
      inputSchema: {
        path: projectPathInput,
        compact: compactInput,
      },
      outputSchema: BundleInstallResultSchema,
    },
    async ({ path, compact }) => {
      const cwd = path || process.cwd();

      const start = Date.now();
      const result = await bundleCmd(["install"], cwd);
      const duration = Date.now() - start;

      const data = parseBundleInstallOutput(
        result.stdout,
        result.stderr,
        result.exitCode,
        duration,
      );
      const rawOutput = (result.stdout + "\n" + result.stderr).trim();
      return compactDualOutput(
        data,
        rawOutput,
        formatBundleInstall,
        compactBundleInstallMap,
        formatBundleInstallCompact,
        compact === false,
      );
    },
  );
}
