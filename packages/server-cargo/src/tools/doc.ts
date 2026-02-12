import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { compactDualOutput, INPUT_LIMITS } from "@paretools/shared";
import { cargo } from "../lib/cargo-runner.js";
import { parseCargoDocOutput } from "../lib/parsers.js";
import { formatCargoDoc, compactDocMap, formatDocCompact } from "../lib/formatters.js";
import { CargoDocResultSchema } from "../schemas/index.js";

export function registerDocTool(server: McpServer) {
  server.registerTool(
    "doc",
    {
      title: "Cargo Doc",
      description:
        "Generates Rust documentation and returns structured output with warning count. Use instead of running `cargo doc` in the terminal.",
      inputSchema: {
        path: z
          .string()
          .max(INPUT_LIMITS.PATH_MAX)
          .optional()
          .describe("Project root path (default: cwd)"),
        open: z
          .boolean()
          .optional()
          .default(false)
          .describe("Open docs in browser after generating"),
        noDeps: z
          .boolean()
          .optional()
          .default(false)
          .describe("Skip building documentation for dependencies (--no-deps)"),
        compact: z
          .boolean()
          .optional()
          .default(true)
          .describe(
            "Auto-compact when structured output exceeds raw CLI tokens. Set false to always get full schema.",
          ),
      },
      outputSchema: CargoDocResultSchema,
    },
    async ({ path, open, noDeps, compact }) => {
      const cwd = path || process.cwd();
      const args = ["doc"];
      if (noDeps) args.push("--no-deps");
      if (open) args.push("--open");

      const result = await cargo(args, cwd);
      const data = parseCargoDocOutput(result.stderr, result.exitCode);
      return compactDualOutput(
        data,
        result.stderr,
        formatCargoDoc,
        compactDocMap,
        formatDocCompact,
        compact === false,
      );
    },
  );
}
