import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { dualOutput } from "@paretools/shared";
import { cargo } from "../lib/cargo-runner.js";
import { parseCargoBuildJson } from "../lib/parsers.js";
import { formatCargoBuild } from "../lib/formatters.js";
import { CargoBuildResultSchema } from "../schemas/index.js";

export function registerCheckTool(server: McpServer) {
  server.registerTool(
    "check",
    {
      title: "Cargo Check",
      description:
        "Runs cargo check (type check without full build) and returns structured diagnostics. Faster than build for error checking. Use instead of running `cargo check` in the terminal.",
      inputSchema: {
        path: z.string().optional().describe("Project root path (default: cwd)"),
        package: z
          .string()
          .optional()
          .describe("Package to check in a workspace"),
      },
      outputSchema: CargoBuildResultSchema,
    },
    async ({ path, package: pkg }) => {
      const cwd = path || process.cwd();
      const args = ["check", "--message-format=json"];
      if (pkg) args.push("-p", pkg);

      const result = await cargo(args, cwd);
      const data = parseCargoBuildJson(result.stdout, result.exitCode);
      return dualOutput(data, formatCargoBuild);
    },
  );
}
