import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { compactDualOutput, assertNoFlagInjection, INPUT_LIMITS } from "@paretools/shared";
import { cargo } from "../lib/cargo-runner.js";
import { parseCargoBuildJson } from "../lib/parsers.js";
import { formatCargoBuild, compactBuildMap, formatBuildCompact } from "../lib/formatters.js";
import { CargoBuildResultSchema } from "../schemas/index.js";

export function registerCheckTool(server: McpServer) {
  server.registerTool(
    "check",
    {
      title: "Cargo Check",
      description:
        "Runs cargo check (type check without full build) and returns structured diagnostics. Faster than build for error checking.",
      inputSchema: {
        path: z
          .string()
          .max(INPUT_LIMITS.PATH_MAX)
          .optional()
          .describe("Project root path (default: cwd)"),
        package: z
          .string()
          .max(INPUT_LIMITS.SHORT_STRING_MAX)
          .optional()
          .describe("Package to check in a workspace"),
        compact: z
          .boolean()
          .optional()
          .default(true)
          .describe(
            "Prefer compact output",
          ),
      },
      outputSchema: CargoBuildResultSchema,
    },
    async ({ path, package: pkg, compact }) => {
      const cwd = path || process.cwd();
      if (pkg) assertNoFlagInjection(pkg, "package");

      const args = ["check", "--message-format=json"];
      if (pkg) args.push("-p", pkg);

      const result = await cargo(args, cwd);
      const data = parseCargoBuildJson(result.stdout, result.exitCode);
      return compactDualOutput(
        data,
        result.stdout,
        formatCargoBuild,
        compactBuildMap,
        formatBuildCompact,
        compact === false,
      );
    },
  );
}
