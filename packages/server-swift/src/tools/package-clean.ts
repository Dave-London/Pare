import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { compactDualOutput, compactInput, projectPathInput } from "@paretools/shared";
import { swiftCmd } from "../lib/swift-runner.js";
import { parsePackageCleanOutput } from "../lib/parsers.js";
import {
  formatPackageClean,
  compactPackageCleanMap,
  formatPackageCleanCompact,
} from "../lib/formatters.js";
import { SwiftPackageCleanResultSchema } from "../schemas/index.js";

/** Registers the `package-clean` tool on the given MCP server. */
export function registerPackageCleanTool(server: McpServer) {
  server.registerTool(
    "package-clean",
    {
      title: "Swift Package Clean",
      description: "Cleans Swift package build artifacts and returns structured result.",
      inputSchema: {
        path: projectPathInput,
        compact: compactInput,
      },
      outputSchema: SwiftPackageCleanResultSchema,
    },
    async ({ path, compact }) => {
      const cwd = path || process.cwd();

      const start = Date.now();
      const result = await swiftCmd(["package", "clean"], cwd);
      const duration = Date.now() - start;

      const data = parsePackageCleanOutput(result.exitCode, duration);
      return compactDualOutput(
        data,
        result.stdout + result.stderr,
        formatPackageClean,
        compactPackageCleanMap,
        formatPackageCleanCompact,
        compact === false,
      );
    },
  );
}
