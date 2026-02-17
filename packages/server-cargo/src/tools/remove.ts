import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { compactDualOutput, assertNoFlagInjection, INPUT_LIMITS } from "@paretools/shared";
import { cargo } from "../lib/cargo-runner.js";
import { parseCargoRemoveOutput } from "../lib/parsers.js";
import { formatCargoRemove, compactRemoveMap, formatRemoveCompact } from "../lib/formatters.js";
import { CargoRemoveResultSchema } from "../schemas/index.js";

export function registerRemoveTool(server: McpServer) {
  server.registerTool(
    "remove",
    {
      title: "Cargo Remove",
      description:
        "Removes dependencies from a Rust project and returns structured output.",
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
        compact: z
          .boolean()
          .optional()
          .default(true)
          .describe(
            "Prefer compact output",
          ),
      },
      outputSchema: CargoRemoveResultSchema,
    },
    async ({ path, packages, dev, compact }) => {
      const cwd = path || process.cwd();

      for (const pkg of packages) {
        assertNoFlagInjection(pkg, "packages");
      }

      const args = ["remove", ...packages];
      if (dev) args.push("--dev");

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
