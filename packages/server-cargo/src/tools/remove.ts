import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { compactDualOutput, assertNoFlagInjection, INPUT_LIMITS } from "@paretools/shared";
import { cargo } from "../lib/cargo-runner.js";
import { parseCargoRemoveOutput } from "../lib/parsers.js";
import { formatCargoRemove, compactRemoveMap, formatRemoveCompact } from "../lib/formatters.js";
import { CargoRemoveResultSchema } from "../schemas/index.js";

/** Registers the `remove` tool on the given MCP server. */
export function registerRemoveTool(server: McpServer) {
  server.registerTool(
    "remove",
    {
      title: "Cargo Remove",
      description:
        "Removes dependencies from a Rust project and returns structured output. Use instead of running `cargo remove` in the terminal.",
      inputSchema: {
        path: z
          .string()
          .max(INPUT_LIMITS.PATH_MAX)
          .optional()
          .describe("Project root path (default: cwd)"),
        packages: z
          .array(z.string().max(INPUT_LIMITS.SHORT_STRING_MAX))
          .max(INPUT_LIMITS.ARRAY_MAX)
          .describe("Package names to remove"),
        dev: z.boolean().optional().default(false).describe("Remove from dev dependencies (--dev)"),
        build: z
          .boolean()
          .optional()
          .default(false)
          .describe("Remove from build dependencies (--build)"),
        dryRun: z
          .boolean()
          .optional()
          .default(false)
          .describe("Preview what would be removed without modifying Cargo.toml (--dry-run)"),
        package: z
          .string()
          .max(INPUT_LIMITS.SHORT_STRING_MAX)
          .optional()
          .describe("Package to target in a workspace (-p <SPEC>)"),
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
        manifestPath: z
          .string()
          .max(INPUT_LIMITS.PATH_MAX)
          .optional()
          .describe("Path to Cargo.toml (--manifest-path <PATH>)"),
        compact: z
          .boolean()
          .optional()
          .default(true)
          .describe(
            "Auto-compact when structured output exceeds raw CLI tokens. Set false to always get full schema.",
          ),
      },
      outputSchema: CargoRemoveResultSchema,
    },
    async ({
      path,
      packages,
      dev,
      build,
      dryRun,
      package: pkg,
      locked,
      frozen,
      offline,
      manifestPath,
      compact,
    }) => {
      const cwd = path || process.cwd();

      for (const p of packages) {
        assertNoFlagInjection(p, "packages");
      }
      if (pkg) assertNoFlagInjection(pkg, "package");
      if (manifestPath) assertNoFlagInjection(manifestPath, "manifestPath");

      const args = ["remove", ...packages];
      if (dev) args.push("--dev");
      if (build) args.push("--build");
      if (dryRun) args.push("--dry-run");
      if (pkg) args.push("-p", pkg);
      if (locked) args.push("--locked");
      if (frozen) args.push("--frozen");
      if (offline) args.push("--offline");
      if (manifestPath) args.push("--manifest-path", manifestPath);

      const result = await cargo(args, cwd);
      const data = parseCargoRemoveOutput(result.stdout, result.stderr, result.exitCode);
      return compactDualOutput(
        data,
        result.stdout + result.stderr,
        formatCargoRemove,
        compactRemoveMap,
        formatRemoveCompact,
        compact === false,
      );
    },
  );
}
