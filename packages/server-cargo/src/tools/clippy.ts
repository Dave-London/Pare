import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { compactDualOutput, INPUT_LIMITS } from "@paretools/shared";
import { cargo } from "../lib/cargo-runner.js";
import { parseCargoClippyJson } from "../lib/parsers.js";
import { formatCargoClippy, compactClippyMap, formatClippyCompact } from "../lib/formatters.js";
import { CargoClippyResultSchema } from "../schemas/index.js";

export function registerClippyTool(server: McpServer) {
  server.registerTool(
    "clippy",
    {
      title: "Cargo Clippy",
      description:
        "Runs cargo clippy and returns structured lint diagnostics.",
      inputSchema: {
        path: z
          .string()
          .max(INPUT_LIMITS.PATH_MAX)
          .optional()
          .describe("Project root path (default: cwd)"),
        compact: z
          .boolean()
          .optional()
          .default(true)
          .describe(
            "Prefer compact output",
          ),
      },
      outputSchema: CargoClippyResultSchema,
    },
    async ({ path, compact }) => {
      const cwd = path || process.cwd();
      const args = ["clippy", "--message-format=json"];

      const result = await cargo(args, cwd);
      const data = parseCargoClippyJson(result.stdout);
      return compactDualOutput(
        data,
        result.stdout,
        formatCargoClippy,
        compactClippyMap,
        formatClippyCompact,
        compact === false,
      );
    },
  );
}
