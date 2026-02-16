import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { compactDualOutput, INPUT_LIMITS } from "@paretools/shared";
import { cargo } from "../lib/cargo-runner.js";
import { parseCargoBuildJson } from "../lib/parsers.js";
import { formatCargoBuild, compactBuildMap, formatBuildCompact } from "../lib/formatters.js";
import { CargoBuildResultSchema } from "../schemas/index.js";

/** Registers the `build` tool on the given MCP server. */
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
        keepGoing: z
          .boolean()
          .optional()
          .default(false)
          .describe(
            "Continue as much as possible after encountering errors (--keep-going). Collects maximum diagnostics in a single run.",
          ),
        compact: z
          .boolean()
          .optional()
          .default(true)
          .describe(
            "Auto-compact when structured output exceeds raw CLI tokens. Set false to always get full schema.",
          ),
      },
      outputSchema: CargoBuildResultSchema,
    },
    async ({ path, release, keepGoing, compact }) => {
      const cwd = path || process.cwd();
      const args = ["build", "--message-format=json"];
      if (release) args.push("--release");
      if (keepGoing) args.push("--keep-going");

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
