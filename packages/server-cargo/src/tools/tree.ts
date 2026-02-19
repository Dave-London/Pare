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
import { parseCargoTreeOutput } from "../lib/parsers.js";
import { formatCargoTree, compactTreeMap, formatTreeCompact } from "../lib/formatters.js";
import { CargoTreeResultSchema } from "../schemas/index.js";

/** Registers the `tree` tool on the given MCP server. */
export function registerTreeTool(server: McpServer) {
  server.registerTool(
    "tree",
    {
      title: "Cargo Tree",
      description: "Displays the dependency tree for a Rust project.",
      inputSchema: {
        path: projectPathInput,
        depth: z.number().optional().describe("Maximum depth of the dependency tree to display"),
        package: z
          .string()
          .max(INPUT_LIMITS.SHORT_STRING_MAX)
          .optional()
          .describe("Focus on a specific package in the tree"),
        duplicates: z
          .boolean()
          .optional()
          .default(false)
          .describe(
            "Show only packages that appear more than once in the tree (--duplicates). Useful for detecting version conflicts.",
          ),
        charset: z
          .enum(["utf8", "ascii"])
          .optional()
          .describe(
            "Character set for tree display (--charset). Use 'ascii' for consistent output regardless of terminal.",
          ),
        prune: z
          .string()
          .max(INPUT_LIMITS.SHORT_STRING_MAX)
          .optional()
          .describe(
            "Prune the given package from the tree display (--prune <SPEC>). Simplifies output by hiding a specific dependency subtree.",
          ),
        invert: z
          .string()
          .max(INPUT_LIMITS.SHORT_STRING_MAX)
          .optional()
          .describe(
            "Invert the tree to show reverse dependencies (--invert <SPEC>). " +
              "Critical for tracing which crates depend on a given package.",
          ),
        edges: z
          .enum([
            "normal",
            "dev",
            "build",
            "dep",
            "no-normal",
            "no-dev",
            "no-build",
            "no-dep",
            "features",
            "no-features",
            "all",
          ])
          .optional()
          .describe(
            "Filter dependency edges by kind (--edges <KINDS>). " +
              "Example: 'normal' to exclude dev/build deps.",
          ),
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
        format: z
          .string()
          .max(INPUT_LIMITS.SHORT_STRING_MAX)
          .optional()
          .describe("Custom format string for each package (--format <FMT>). Example: '{p} {l}'"),
        target: z
          .string()
          .max(INPUT_LIMITS.SHORT_STRING_MAX)
          .optional()
          .describe("Filter for platform-specific dependencies (--target <TRIPLE>)"),
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
      outputSchema: CargoTreeResultSchema,
    },
    async ({
      path,
      depth,
      package: pkg,
      duplicates,
      charset,
      prune,
      invert,
      edges,
      features,
      allFeatures,
      noDefaultFeatures,
      format,
      target,
      locked,
      frozen,
      offline,
      compact,
    }) => {
      const cwd = path || process.cwd();

      if (pkg) assertNoFlagInjection(pkg, "package");
      if (prune) assertNoFlagInjection(prune, "prune");
      if (invert) assertNoFlagInjection(invert, "invert");
      if (format) assertNoFlagInjection(format, "format");
      if (target) assertNoFlagInjection(target, "target");

      const args = ["tree"];
      if (depth !== undefined) {
        args.push("--depth", String(depth));
      }
      if (pkg) args.push("-p", pkg);
      if (duplicates) args.push("--duplicates");
      if (charset) args.push("--charset", charset);
      if (prune) args.push("--prune", prune);
      if (invert) args.push("--invert", invert);
      if (edges) args.push("--edges", edges);
      if (features && features.length > 0) {
        for (const f of features) {
          assertNoFlagInjection(f, "features");
        }
        args.push("--features", features.join(","));
      }
      if (allFeatures) args.push("--all-features");
      if (noDefaultFeatures) args.push("--no-default-features");
      if (format) args.push("--format", format);
      if (target) args.push("--target", target);
      if (locked) args.push("--locked");
      if (frozen) args.push("--frozen");
      if (offline) args.push("--offline");

      const result = await cargo(args, cwd);
      const data = parseCargoTreeOutput(result.stdout, result.stderr, result.exitCode);
      return compactDualOutput(
        data,
        result.stdout || result.stderr,
        formatCargoTree,
        compactTreeMap,
        formatTreeCompact,
        compact === false,
      );
    },
  );
}
