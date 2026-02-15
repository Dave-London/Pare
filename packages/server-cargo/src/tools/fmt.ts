import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { compactDualOutput, INPUT_LIMITS } from "@paretools/shared";
import { cargo } from "../lib/cargo-runner.js";
import { parseCargoFmtOutput } from "../lib/parsers.js";
import { formatCargoFmt, compactFmtMap, formatFmtCompact } from "../lib/formatters.js";
import { CargoFmtResultSchema } from "../schemas/index.js";

/** Registers the `fmt` tool on the given MCP server. */
export function registerFmtTool(server: McpServer) {
  server.registerTool(
    "fmt",
    {
      title: "Cargo Fmt",
      description:
        "Checks or fixes Rust formatting and returns structured output. Use instead of running `cargo fmt` in the terminal.",
      inputSchema: {
        path: z
          .string()
          .max(INPUT_LIMITS.PATH_MAX)
          .optional()
          .describe("Project root path (default: cwd)"),
        check: z
          .boolean()
          .optional()
          .default(false)
          .describe("Check only without modifying files (--check)"),
        compact: z
          .boolean()
          .optional()
          .default(true)
          .describe(
            "Auto-compact when structured output exceeds raw CLI tokens. Set false to always get full schema.",
          ),
      },
      outputSchema: CargoFmtResultSchema,
    },
    async ({ path, check, compact }) => {
      const cwd = path || process.cwd();
      const args = ["fmt"];
      if (check) args.push("--check");

      const result = await cargo(args, cwd);
      const data = parseCargoFmtOutput(result.stdout, result.stderr, result.exitCode, !!check);
      return compactDualOutput(
        data,
        result.stdout + result.stderr,
        formatCargoFmt,
        compactFmtMap,
        formatFmtCompact,
        compact === false,
      );
    },
  );
}
