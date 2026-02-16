import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { compactDualOutput, assertNoFlagInjection, INPUT_LIMITS } from "@paretools/shared";
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
      description:
        "Displays the dependency tree for a Rust project. " +
        "Use instead of running `cargo tree` in the terminal.",
      inputSchema: {
        path: z
          .string()
          .max(INPUT_LIMITS.PATH_MAX)
          .optional()
          .describe("Project root path (default: cwd)"),
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
        compact: z
          .boolean()
          .optional()
          .default(true)
          .describe(
            "Auto-compact when structured output exceeds raw CLI tokens. Set false to always get full schema.",
          ),
      },
      outputSchema: CargoTreeResultSchema,
    },
    async ({ path, depth, package: pkg, duplicates, charset, prune, compact }) => {
      const cwd = path || process.cwd();

      if (pkg) {
        assertNoFlagInjection(pkg, "package");
      }
      if (prune) {
        assertNoFlagInjection(prune, "prune");
      }

      const args = ["tree"];
      if (depth !== undefined) {
        args.push("--depth", String(depth));
      }
      if (pkg) {
        args.push("-p", pkg);
      }
      if (duplicates) {
        args.push("--duplicates");
      }
      if (charset) {
        args.push("--charset", charset);
      }
      if (prune) {
        args.push("--prune", prune);
      }

      const result = await cargo(args, cwd);

      if (result.exitCode !== 0) {
        throw new Error(`cargo tree failed: ${result.stderr}`);
      }

      const data = parseCargoTreeOutput(result.stdout);
      return compactDualOutput(
        data,
        result.stdout,
        formatCargoTree,
        compactTreeMap,
        formatTreeCompact,
        compact === false,
      );
    },
  );
}
