import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { compactDualOutput, compactInput, projectPathInput } from "@paretools/shared";
import { swiftCmd } from "../lib/swift-runner.js";
import { parsePackageShowDependenciesOutput } from "../lib/parsers.js";
import {
  formatPackageShowDependencies,
  compactPackageShowDependenciesMap,
  formatPackageShowDependenciesCompact,
} from "../lib/formatters.js";
import { SwiftPackageShowDependenciesResultSchema } from "../schemas/index.js";

/** Registers the `package-show-dependencies` tool on the given MCP server. */
export function registerPackageShowDependenciesTool(server: McpServer) {
  server.registerTool(
    "package-show-dependencies",
    {
      title: "Swift Package Show Dependencies",
      description:
        "Shows the dependency tree of a Swift package and returns structured dependency data.",
      inputSchema: {
        format: z
          .enum(["text", "json", "dot"])
          .optional()
          .describe("Output format (text/json/dot)"),
        path: projectPathInput,
        compact: compactInput,
      },
      outputSchema: SwiftPackageShowDependenciesResultSchema,
    },
    async ({ format, path, compact }) => {
      const cwd = path || process.cwd();

      const cmdArgs = ["package", "show-dependencies"];
      if (format) cmdArgs.push("--format", format);

      const result = await swiftCmd(cmdArgs, cwd);

      const data = parsePackageShowDependenciesOutput(
        result.stdout,
        result.stderr,
        result.exitCode,
      );
      return compactDualOutput(
        data,
        result.stdout + result.stderr,
        formatPackageShowDependencies,
        compactPackageShowDependenciesMap,
        formatPackageShowDependenciesCompact,
        compact === false,
      );
    },
  );
}
