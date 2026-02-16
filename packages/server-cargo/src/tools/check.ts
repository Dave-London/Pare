import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { compactDualOutput, assertNoFlagInjection, INPUT_LIMITS } from "@paretools/shared";
import { cargo } from "../lib/cargo-runner.js";
import { parseCargoBuildJson } from "../lib/parsers.js";
import { formatCargoBuild, compactBuildMap, formatBuildCompact } from "../lib/formatters.js";
import { CargoBuildResultSchema } from "../schemas/index.js";

/** Registers the `check` tool on the given MCP server. */
export function registerCheckTool(server: McpServer) {
  server.registerTool(
    "check",
    {
      title: "Cargo Check",
      description:
        "Runs cargo check (type check without full build) and returns structured diagnostics. Faster than build for error checking. Use instead of running `cargo check` in the terminal.",
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
        keepGoing: z
          .boolean()
          .optional()
          .default(false)
          .describe(
            "Continue as much as possible after encountering errors (--keep-going). Collects maximum diagnostics in a single run.",
          ),
        allTargets: z
          .boolean()
          .optional()
          .default(false)
          .describe("Check all targets (lib, bins, tests, benches, examples) (--all-targets)"),
        release: z
          .boolean()
          .optional()
          .default(false)
          .describe("Check in release mode with optimizations (--release)"),
        workspace: z
          .boolean()
          .optional()
          .default(false)
          .describe("Check all packages in the workspace (--workspace)"),
        compact: z
          .boolean()
          .optional()
          .default(true)
          .describe(
            "Auto-compact when structured output exceeds raw CLI tokens. Set false to always get full schema.",
          ),
      },
      outputSchema: CargoBuildResultSchema,
    },
    async ({ path, package: pkg, keepGoing, allTargets, release, workspace, compact }) => {
      const cwd = path || process.cwd();
      if (pkg) assertNoFlagInjection(pkg, "package");

      const args = ["check", "--message-format=json"];
      if (pkg) args.push("-p", pkg);
      if (keepGoing) args.push("--keep-going");
      if (allTargets) args.push("--all-targets");
      if (release) args.push("--release");
      if (workspace) args.push("--workspace");

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
