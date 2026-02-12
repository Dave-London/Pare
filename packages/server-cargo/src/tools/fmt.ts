import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { dualOutput, INPUT_LIMITS } from "@paretools/shared";
import { cargo } from "../lib/cargo-runner.js";
import { parseCargoFmtOutput } from "../lib/parsers.js";
import { formatCargoFmt } from "../lib/formatters.js";
import { CargoFmtResultSchema } from "../schemas/index.js";

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
      },
      outputSchema: CargoFmtResultSchema,
    },
    async ({ path, check }) => {
      const cwd = path || process.cwd();
      const args = ["fmt"];
      if (check) args.push("--check");

      const result = await cargo(args, cwd);
      const data = parseCargoFmtOutput(result.stdout, result.stderr, result.exitCode, !!check);
      return dualOutput(data, formatCargoFmt);
    },
  );
}
