import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { compactDualOutput, assertNoFlagInjection, INPUT_LIMITS } from "@paretools/shared";
import { jqCmd } from "../lib/search-runner.js";
import { parseJqOutput } from "../lib/parsers.js";
import { formatJq, compactJqMap, formatJqCompact } from "../lib/formatters.js";
import { JqResultSchema } from "../schemas/index.js";

export function registerJqTool(server: McpServer) {
  server.registerTool(
    "jq",
    {
      title: "JSON Processor",
      description:
        "Processes and transforms JSON using jq expressions. Accepts JSON from a file path or inline string. Returns the transformed result. Use instead of running `jq` in the terminal.",
      inputSchema: {
        expression: z
          .string()
          .max(INPUT_LIMITS.STRING_MAX)
          .describe("jq filter expression (e.g., '.name', '.[] | select(.age > 30)')"),
        file: z
          .string()
          .max(INPUT_LIMITS.PATH_MAX)
          .optional()
          .describe("Path to a JSON file to process"),
        input: z
          .string()
          .max(INPUT_LIMITS.STRING_MAX)
          .optional()
          .describe("Inline JSON string to process (used when file is not provided)"),
        rawOutput: z
          .boolean()
          .optional()
          .default(false)
          .describe("Output raw strings without JSON quotes (-r flag)"),
        sortKeys: z.boolean().optional().default(false).describe("Sort object keys (-S flag)"),
        compact: z
          .boolean()
          .optional()
          .default(true)
          .describe(
            "Prefer compact output",
          ),
      },
      outputSchema: JqResultSchema,
    },
    async ({ expression, file, input, rawOutput, sortKeys, compact }) => {
      if (file) assertNoFlagInjection(file, "file");

      if (!file && !input) {
        const data = parseJqOutput("", "Either 'file' or 'input' must be provided.", 1);
        const rawText = "jq: error — either 'file' or 'input' must be provided.";
        return compactDualOutput(
          data,
          rawText,
          formatJq,
          compactJqMap,
          formatJqCompact,
          compact === false,
        );
      }

      const args: string[] = [];

      if (rawOutput) args.push("-r");
      if (sortKeys) args.push("-S");

      args.push(expression);

      if (file) {
        args.push(file);
      }

      const result = await jqCmd(args, {
        stdin: file ? undefined : input,
      });

      const data = parseJqOutput(result.stdout, result.stderr, result.exitCode);
      const rawText = (result.stdout + "\n" + result.stderr).trim();

      return compactDualOutput(
        data,
        rawText,
        formatJq,
        compactJqMap,
        formatJqCompact,
        compact === false,
      );
    },
  );
}
