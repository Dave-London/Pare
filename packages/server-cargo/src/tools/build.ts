import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { dualOutput } from "@paretools/shared";
import { cargo } from "../lib/cargo-runner.js";
import { parseCargoBuildJson } from "../lib/parsers.js";
import { formatCargoBuild } from "../lib/formatters.js";
import { CargoBuildResultSchema } from "../schemas/index.js";

export function registerBuildTool(server: McpServer) {
  server.registerTool(
    "build",
    {
      title: "Cargo Build",
      description:
        "Runs cargo build and returns structured diagnostics (file, line, code, severity, message)",
      inputSchema: {
        path: z.string().optional().describe("Project root path (default: cwd)"),
        release: z.boolean().optional().default(false).describe("Build in release mode"),
      },
      outputSchema: CargoBuildResultSchema,
    },
    async ({ path, release }) => {
      const cwd = path || process.cwd();
      const args = ["build", "--message-format=json"];
      if (release) args.push("--release");

      const result = await cargo(args, cwd);
      const data = parseCargoBuildJson(result.stdout, result.exitCode);
      return dualOutput(data, formatCargoBuild);
    },
  );
}
