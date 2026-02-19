import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  compactDualOutput,
  assertNoFlagInjection,
  INPUT_LIMITS,
  compactInput,
  projectPathInput,
} from "@paretools/shared";
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
        "Adds dependencies to a Rust project and returns structured output. WARNING: may execute untrusted code.",
      inputSchema: {
        path: projectPathInput,
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
        sourcePath: z
          .string()
          .max(INPUT_LIMITS.PATH_MAX)
          .optional()
          .describe("Use a local crate path source (--path <PATH>)"),
        git: z
          .string()
          .max(INPUT_LIMITS.STRING_MAX)
          .optional()
          .describe("Use a git source URL (--git <URL>)"),
        branch: z
          .string()
          .max(INPUT_LIMITS.SHORT_STRING_MAX)
          .optional()
          .describe("Git branch to use with --git (--branch <BRANCH>)"),
        tag: z
          .string()
          .max(INPUT_LIMITS.SHORT_STRING_MAX)
          .optional()
          .describe("Git tag to use with --git (--tag <TAG>)"),
        rev: z
          .string()
          .max(INPUT_LIMITS.SHORT_STRING_MAX)
          .optional()
          .describe("Git revision to use with --git (--rev <REV>)"),
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
        compact: compactInput,
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
      sourcePath,
      git,
      branch,
      tag,
      rev,
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
      if (sourcePath) assertNoFlagInjection(sourcePath, "sourcePath");
      if (git) assertNoFlagInjection(git, "git");
      if (branch) assertNoFlagInjection(branch, "branch");
      if (tag) assertNoFlagInjection(tag, "tag");
      if (rev) assertNoFlagInjection(rev, "rev");

      if (sourcePath && git) {
        throw new Error("sourcePath (--path) and git (--git) are mutually exclusive");
      }
      if ((branch || tag || rev) && !git) {
        throw new Error("branch/tag/rev require git source (--git)");
      }

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
      if (sourcePath) args.push("--path", sourcePath);
      if (git) args.push("--git", git);
      if (branch) args.push("--branch", branch);
      if (tag) args.push("--tag", tag);
      if (rev) args.push("--rev", rev);
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
