import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { compactDualOutput, assertNoFlagInjection, INPUT_LIMITS } from "@paretools/shared";
import { cargo } from "../lib/cargo-runner.js";
import { parseCargoAddOutput } from "../lib/parsers.js";
import { formatCargoAdd, compactAddMap, formatAddCompact } from "../lib/formatters.js";
import { CargoAddResultSchema } from "../schemas/index.js";

/** Registers the `add` tool on the given MCP server. */
export function registerAddTool(server: McpServer) {
  server.registerTool(
    "add",
    {
      title: "Cargo Add",
      description:
        "Adds dependencies to a Rust project and returns structured output. " +
        "Use instead of running `cargo add` in the terminal. " +
        "WARNING: Adding crates downloads and compiles third-party code which may include build scripts (build.rs). " +
        "Only add trusted crates. Use dryRun to preview changes before committing.",
      inputSchema: {
        path: z
          .string()
          .max(INPUT_LIMITS.PATH_MAX)
          .optional()
          .describe("Project root path (default: cwd)"),
        packages: z
          .array(z.string().max(INPUT_LIMITS.SHORT_STRING_MAX))
          .max(INPUT_LIMITS.ARRAY_MAX)
          .describe('Packages to add (e.g. ["serde", "tokio@1.0"])'),
        dev: z.boolean().optional().default(false).describe("Add as dev dependency (--dev)"),
        features: z
          .array(z.string().max(INPUT_LIMITS.SHORT_STRING_MAX))
          .max(INPUT_LIMITS.ARRAY_MAX)
          .optional()
          .describe('Features to enable (e.g. ["derive", "full"])'),
        dryRun: z
          .boolean()
          .optional()
          .default(false)
          .describe("Preview what would be added without modifying Cargo.toml (--dry-run)"),
        build: z.boolean().optional().default(false).describe("Add as build dependency (--build)"),
        optional: z
          .boolean()
          .optional()
          .default(false)
          .describe("Add as optional dependency (--optional)"),
        noDefaultFeatures: z
          .boolean()
          .optional()
          .default(false)
          .describe("Disable default features of the dependency (--no-default-features)"),
        package: z
          .string()
          .max(INPUT_LIMITS.SHORT_STRING_MAX)
          .optional()
          .describe("Package to target in a workspace (-p <SPEC>)"),
        rename: z
          .string()
          .max(INPUT_LIMITS.SHORT_STRING_MAX)
          .optional()
          .describe("Rename the dependency (--rename <NAME>)"),
        registry: z
          .string()
          .max(INPUT_LIMITS.SHORT_STRING_MAX)
          .optional()
          .describe("Registry to use (--registry <NAME>)"),
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
      outputSchema: CargoAddResultSchema,
    },
    async ({
      path,
      packages,
      dev,
      features,
      dryRun,
      build,
      optional,
      noDefaultFeatures,
      package: pkg,
      rename,
      registry,
      locked,
      frozen,
      offline,
      compact,
    }) => {
      const cwd = path || process.cwd();

      for (const p of packages) {
        assertNoFlagInjection(p, "packages");
      }
      for (const f of features ?? []) {
        assertNoFlagInjection(f, "features");
      }
      if (pkg) assertNoFlagInjection(pkg, "package");
      if (rename) assertNoFlagInjection(rename, "rename");
      if (registry) assertNoFlagInjection(registry, "registry");

      const args = ["add", ...packages];
      if (dev) args.push("--dev");
      if (features && features.length > 0) {
        args.push("--features", features.join(","));
      }
      if (dryRun) args.push("--dry-run");
      if (build) args.push("--build");
      if (optional) args.push("--optional");
      if (noDefaultFeatures) args.push("--no-default-features");
      if (pkg) args.push("-p", pkg);
      if (rename) args.push("--rename", rename);
      if (registry) args.push("--registry", registry);
      if (locked) args.push("--locked");
      if (frozen) args.push("--frozen");
      if (offline) args.push("--offline");

      // Gap #86: Determine dependency type from flags
      const depType: "normal" | "dev" | "build" = dev ? "dev" : build ? "build" : "normal";

      const result = await cargo(args, cwd);
      const data = parseCargoAddOutput(result.stdout, result.stderr, result.exitCode, depType);
      return compactDualOutput(
        data,
        result.stdout + result.stderr,
        formatCargoAdd,
        compactAddMap,
        formatAddCompact,
        compact === false,
      );
    },
  );
}
