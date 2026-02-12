import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { compactDualOutput, assertNoFlagInjection, INPUT_LIMITS } from "@paretools/shared";
import { cargo } from "../lib/cargo-runner.js";
import { parseCargoUpdateOutput } from "../lib/parsers.js";
import { formatCargoUpdate, compactUpdateMap, formatUpdateCompact } from "../lib/formatters.js";
import { CargoUpdateResultSchema } from "../schemas/index.js";

export function registerUpdateTool(server: McpServer) {
  server.registerTool(
    "update",
    {
      title: "Cargo Update",
      description:
        "Updates dependencies in the lock file. Optionally updates a single package. " +
        "Use instead of running `cargo update` in the terminal.",
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
          .describe("Specific package to update (e.g. 'serde'). Omit to update all."),
        compact: z
          .boolean()
          .optional()
          .default(true)
          .describe(
            "Auto-compact when structured output exceeds raw CLI tokens. Set false to always get full schema.",
          ),
      },
      outputSchema: CargoUpdateResultSchema,
    },
    async ({ path, package: pkg, compact }) => {
      const cwd = path || process.cwd();

      if (pkg) {
        assertNoFlagInjection(pkg, "package");
      }

      const args = ["update"];
      if (pkg) {
        args.push("-p", pkg);
      }

      const result = await cargo(args, cwd);
      const data = parseCargoUpdateOutput(result.stdout, result.stderr, result.exitCode);
      return compactDualOutput(
        data,
        result.stdout + result.stderr,
        formatCargoUpdate,
        compactUpdateMap,
        formatUpdateCompact,
        compact === false,
      );
    },
  );
}
