import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { compactDualOutput, compactInput, projectPathInput } from "@paretools/shared";
import { swiftCmd } from "../lib/swift-runner.js";
import { parsePackageResolveOutput } from "../lib/parsers.js";
import {
  formatPackageResolve,
  compactPackageResolveMap,
  formatPackageResolveCompact,
} from "../lib/formatters.js";
import { SwiftPackageResolveResultSchema } from "../schemas/index.js";

/** Registers the `package-resolve` tool on the given MCP server. */
export function registerPackageResolveTool(server: McpServer) {
  server.registerTool(
    "package-resolve",
    {
      title: "Swift Package Resolve",
      description: "Resolves Swift package dependencies and returns structured resolution results.",
      inputSchema: {
        path: projectPathInput,
        compact: compactInput,
      },
      outputSchema: SwiftPackageResolveResultSchema,
    },
    async ({ path, compact }) => {
      const cwd = path || process.cwd();

      const start = Date.now();
      const result = await swiftCmd(["package", "resolve"], cwd);
      const duration = Date.now() - start;

      const data = parsePackageResolveOutput(
        result.stdout,
        result.stderr,
        result.exitCode,
        duration,
      );
      return compactDualOutput(
        data,
        result.stdout + result.stderr,
        formatPackageResolve,
        compactPackageResolveMap,
        formatPackageResolveCompact,
        compact === false,
      );
    },
  );
}
