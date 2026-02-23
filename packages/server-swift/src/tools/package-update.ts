import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  compactDualOutput,
  assertNoFlagInjection,
  INPUT_LIMITS,
  compactInput,
  projectPathInput,
} from "@paretools/shared";
import { swiftCmd } from "../lib/swift-runner.js";
import { parsePackageUpdateOutput } from "../lib/parsers.js";
import {
  formatPackageUpdate,
  compactPackageUpdateMap,
  formatPackageUpdateCompact,
} from "../lib/formatters.js";
import { SwiftPackageUpdateResultSchema } from "../schemas/index.js";

/** Registers the `package-update` tool on the given MCP server. */
export function registerPackageUpdateTool(server: McpServer) {
  server.registerTool(
    "package-update",
    {
      title: "Swift Package Update",
      description: "Updates Swift package dependencies and returns structured update results.",
      inputSchema: {
        packages: z
          .array(z.string().max(INPUT_LIMITS.SHORT_STRING_MAX))
          .max(INPUT_LIMITS.ARRAY_MAX)
          .optional()
          .describe("Specific packages to update (updates all if not specified)"),
        path: projectPathInput,
        compact: compactInput,
      },
      outputSchema: SwiftPackageUpdateResultSchema,
    },
    async ({ packages, path, compact }) => {
      const cwd = path || process.cwd();

      const cmdArgs = ["package", "update"];
      if (packages && packages.length > 0) {
        for (const pkg of packages) {
          assertNoFlagInjection(pkg, "packages");
        }
        cmdArgs.push(...packages);
      }

      const start = Date.now();
      const result = await swiftCmd(cmdArgs, cwd);
      const duration = Date.now() - start;

      const data = parsePackageUpdateOutput(
        result.stdout,
        result.stderr,
        result.exitCode,
        duration,
      );
      return compactDualOutput(
        data,
        result.stdout + result.stderr,
        formatPackageUpdate,
        compactPackageUpdateMap,
        formatPackageUpdateCompact,
        compact === false,
      );
    },
  );
}
