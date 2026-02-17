import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { compactDualOutput, INPUT_LIMITS } from "@paretools/shared";
import { cargo } from "../lib/cargo-runner.js";
import { parseCargoBuildJson } from "../lib/parsers.js";
import { formatCargoBuild, compactBuildMap, formatBuildCompact } from "../lib/formatters.js";
import { CargoBuildResultSchema } from "../schemas/index.js";

export function registerBuildTool(server: McpServer) {
  server.registerTool(
    "build",
    {
      title: "Cargo Build",
      description:
        "Runs cargo build and returns structured diagnostics (file, line, code, severity, message). Use instead of running `cargo build` in the terminal.",
      inputSchema: {
        path: z
          .string()
          .max(INPUT_LIMITS.PATH_MAX)
          .optional()
          .describe("Project root path (default: cwd)"),
        release: z.boolean().optional().default(false).describe("Build in release mode"),
        compact: z
          .boolean()
          .optional()
          .default(true)
          .describe(
            "Prefer compact output",
          ),
      },
      outputSchema: CargoBuildResultSchema,
    },
    async ({ path, release, compact }) => {
      const cwd = path || process.cwd();
      const args = ["build", "--message-format=json"];
      if (release) args.push("--release");

      const result = await cargo(args, cwd);
      const data = parseCargoBuildJson(result.stdout, result.exitCode);
      return compactDualOutput(
        data,
        result.stdout,
        formatCargoBuild,
        compactBuildMap,
        formatBuildCompact,
        compact === false,
      );
    },
  );
}
