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
import { parsePackageInitOutput } from "../lib/parsers.js";
import {
  formatPackageInit,
  compactPackageInitMap,
  formatPackageInitCompact,
} from "../lib/formatters.js";
import { SwiftPackageInitResultSchema } from "../schemas/index.js";

/** Registers the `package-init` tool on the given MCP server. */
export function registerPackageInitTool(server: McpServer) {
  server.registerTool(
    "package-init",
    {
      title: "Swift Package Init",
      description:
        "Initializes a new Swift package and returns structured result with created files.",
      inputSchema: {
        type: z
          .enum(["library", "executable", "tool", "macro"])
          .optional()
          .describe("Package type to create"),
        name: z.string().max(INPUT_LIMITS.SHORT_STRING_MAX).optional().describe("Package name"),
        path: projectPathInput,
        compact: compactInput,
      },
      outputSchema: SwiftPackageInitResultSchema,
    },
    async ({ type, name, path, compact }) => {
      const cwd = path || process.cwd();
      if (name) assertNoFlagInjection(name, "name");

      const cmdArgs = ["package", "init"];
      if (type) cmdArgs.push("--type", type);
      if (name) cmdArgs.push("--name", name);

      const start = Date.now();
      const result = await swiftCmd(cmdArgs, cwd);
      const duration = Date.now() - start;

      const data = parsePackageInitOutput(result.stdout, result.stderr, result.exitCode, duration);
      return compactDualOutput(
        data,
        result.stdout + result.stderr,
        formatPackageInit,
        compactPackageInitMap,
        formatPackageInitCompact,
        compact === false,
      );
    },
  );
}
