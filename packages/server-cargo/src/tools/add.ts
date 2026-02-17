import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { compactDualOutput, assertNoFlagInjection, INPUT_LIMITS } from "@paretools/shared";
import { cargo } from "../lib/cargo-runner.js";
import { parseCargoAddOutput } from "../lib/parsers.js";
import { formatCargoAdd, compactAddMap, formatAddCompact } from "../lib/formatters.js";
import { CargoAddResultSchema } from "../schemas/index.js";

export function registerAddTool(server: McpServer) {
  server.registerTool(
    "add",
    {
      title: "Cargo Add",
      description:
        "Adds dependencies to a Rust project and returns structured output. WARNING: may execute untrusted code.",
      inputSchema: {
        path: z
          .string()
          .max(INPUT_LIMITS.PATH_MAX)
          .optional()
          .describe("Project root path"),
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
        compact: z
          .boolean()
          .optional()
          .default(true)
          .describe(
            "Prefer compact output",
          ),
      },
      outputSchema: CargoAddResultSchema,
    },
    async ({ path, packages, dev, features, dryRun, compact }) => {
      const cwd = path || process.cwd();

      for (const pkg of packages) {
        assertNoFlagInjection(pkg, "packages");
      }
      for (const f of features ?? []) {
        assertNoFlagInjection(f, "features");
      }

      const args = ["add", ...packages];
      if (dev) args.push("--dev");
      if (features && features.length > 0) {
        args.push("--features", features.join(","));
      }
      if (dryRun) args.push("--dry-run");

      const result = await cargo(args, cwd);
      const data = parseCargoAddOutput(result.stdout, result.stderr, result.exitCode);
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
