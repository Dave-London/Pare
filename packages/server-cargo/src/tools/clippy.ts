import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { dualOutput } from "@paretools/shared";
import { cargo } from "../lib/cargo-runner.js";
import { parseCargoClippyJson } from "../lib/parsers.js";
import { formatCargoClippy } from "../lib/formatters.js";
import { CargoClippyResultSchema } from "../schemas/index.js";

export function registerClippyTool(server: McpServer) {
  server.registerTool(
    "clippy",
    {
      title: "Cargo Clippy",
      description:
        "Runs cargo clippy and returns structured lint diagnostics. Use instead of running `cargo clippy` in the terminal.",
      inputSchema: {
        path: z.string().optional().describe("Project root path (default: cwd)"),
      },
      outputSchema: CargoClippyResultSchema,
    },
    async ({ path }) => {
      const cwd = path || process.cwd();
      const args = ["clippy", "--message-format=json"];

      const result = await cargo(args, cwd);
      const data = parseCargoClippyJson(result.stdout);
      return dualOutput(data, formatCargoClippy);
    },
  );
}
