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
        features: z
          .array(z.string().max(INPUT_LIMITS.SHORT_STRING_MAX))
          .max(INPUT_LIMITS.ARRAY_MAX)
          .optional()
          .describe("Space or comma separated list of features to activate (--features)"),
        allFeatures: z
          .boolean()
          .optional()
          .default(false)
          .describe("Activate all available features (--all-features)"),
        noDefaultFeatures: z
          .boolean()
          .optional()
          .default(false)
          .describe("Do not activate the default feature (--no-default-features)"),
        target: z
          .string()
          .max(INPUT_LIMITS.SHORT_STRING_MAX)
          .optional()
          .describe("Check for the target triple (--target <TRIPLE>)"),
        locked: z
          .boolean()
          .optional()
          .default(false)
          .describe("Require Cargo.lock is up to date (--locked)"),
        frozen: z
          .boolean()
          .optional()
          .default(false)
          .describe("Require Cargo.lock and cache are up to date (--frozen)"),
        offline: z
          .boolean()
          .optional()
          .default(false)
          .describe("Run without accessing the network (--offline)"),
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
    async ({
      path,
      package: pkg,
      keepGoing,
      allTargets,
      release,
      workspace,
      features,
      allFeatures,
      noDefaultFeatures,
      target,
      locked,
      frozen,
      offline,
      compact,
    }) => {
      const cwd = path || process.cwd();
      if (pkg) assertNoFlagInjection(pkg, "package");
      if (target) assertNoFlagInjection(target, "target");

      const args = ["check", "--message-format=json"];
      if (pkg) args.push("-p", pkg);
      if (keepGoing) args.push("--keep-going");
      if (allTargets) args.push("--all-targets");
      if (release) args.push("--release");
      if (workspace) args.push("--workspace");
      if (features && features.length > 0) {
        for (const f of features) {
          assertNoFlagInjection(f, "features");
        }
        args.push("--features", features.join(","));
      }
      if (allFeatures) args.push("--all-features");
      if (noDefaultFeatures) args.push("--no-default-features");
      if (target) args.push("--target", target);
      if (locked) args.push("--locked");
      if (frozen) args.push("--frozen");
      if (offline) args.push("--offline");

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
