import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  compactDualOutput,
  assertNoFlagInjection,
  INPUT_LIMITS,
  compactInput,
  projectPathInput,
} from "@paretools/shared";
import { rubyCmd } from "../lib/ruby-runner.js";
import { parseCheckOutput } from "../lib/parsers.js";
import { formatCheck, compactCheckMap, formatCheckCompact } from "../lib/formatters.js";
import { RubyCheckResultSchema } from "../schemas/index.js";

/** Registers the `check` tool on the given MCP server. */
export function registerCheckTool(server: McpServer) {
  server.registerTool(
    "check",
    {
      title: "Ruby Syntax Check",
      description:
        "Checks a Ruby file for syntax errors using `ruby -c` and returns structured validation results.",
      inputSchema: {
        file: z
          .string()
          .max(INPUT_LIMITS.PATH_MAX)
          .describe("Path to the Ruby file to syntax-check"),
        path: projectPathInput,
        compact: compactInput,
      },
      outputSchema: RubyCheckResultSchema,
    },
    async ({ file, path, compact }) => {
      assertNoFlagInjection(file, "file");

      const cwd = path || process.cwd();
      const result = await rubyCmd(["-c", file], cwd);

      const data = parseCheckOutput(file, result.stdout, result.stderr, result.exitCode);
      const rawOutput = (result.stdout + "\n" + result.stderr).trim();
      return compactDualOutput(
        data,
        rawOutput,
        formatCheck,
        compactCheckMap,
        formatCheckCompact,
        compact === false,
      );
    },
  );
}
