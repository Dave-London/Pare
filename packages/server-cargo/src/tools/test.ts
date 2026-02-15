import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { compactDualOutput, assertNoFlagInjection, INPUT_LIMITS } from "@paretools/shared";
import { cargo } from "../lib/cargo-runner.js";
import { parseCargoTestOutput } from "../lib/parsers.js";
import { formatCargoTest, compactTestMap, formatTestCompact } from "../lib/formatters.js";
import { CargoTestResultSchema } from "../schemas/index.js";

/** Registers the `test` tool on the given MCP server. */
export function registerTestTool(server: McpServer) {
  server.registerTool(
    "test",
    {
      title: "Cargo Test",
      description:
        "Runs cargo test and returns structured test results (name, status, pass/fail counts). Use instead of running `cargo test` in the terminal.",
      inputSchema: {
        path: z
          .string()
          .max(INPUT_LIMITS.PATH_MAX)
          .optional()
          .describe("Project root path (default: cwd)"),
        filter: z
          .string()
          .max(INPUT_LIMITS.SHORT_STRING_MAX)
          .optional()
          .describe("Test name filter pattern"),
        compact: z
          .boolean()
          .optional()
          .default(true)
          .describe(
            "Auto-compact when structured output exceeds raw CLI tokens. Set false to always get full schema.",
          ),
      },
      outputSchema: CargoTestResultSchema,
    },
    async ({ path, filter, compact }) => {
      const cwd = path || process.cwd();
      if (filter) assertNoFlagInjection(filter, "filter");

      const args = ["test"];
      if (filter) args.push(filter);

      const result = await cargo(args, cwd);
      const data = parseCargoTestOutput(result.stdout, result.exitCode);
      return compactDualOutput(
        data,
        result.stdout,
        formatCargoTest,
        compactTestMap,
        formatTestCompact,
        compact === false,
      );
    },
  );
}
