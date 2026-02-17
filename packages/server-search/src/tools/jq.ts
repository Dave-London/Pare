import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { compactDualOutput, assertNoFlagInjection, INPUT_LIMITS } from "@paretools/shared";
import { jqCmd } from "../lib/search-runner.js";
import { parseJqOutput } from "../lib/parsers.js";
import { formatJq, compactJqMap, formatJqCompact } from "../lib/formatters.js";
import { JqResultSchema } from "../schemas/index.js";

/** Registers the `jq` tool on the given MCP server. */
export function registerJqTool(server: McpServer) {
  server.registerTool(
    "jq",
    {
      title: "JSON Processor",
      description:
        "Processes and transforms JSON using jq expressions. Accepts JSON from a file path or inline string. Returns the transformed result.",
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
        nullInput: z
          .boolean()
          .optional()
          .describe("Don't read any input, useful for generating JSON from scratch (--null-input)"),
        slurp: z
          .boolean()
          .optional()
          .describe(
            "Read entire input into a single array, useful for JSONL or multiple objects (--slurp)",
          ),
        compactOutput: z
          .boolean()
          .optional()
          .describe("Compact output, no pretty-printing (--compact-output)"),
        rawInput: z
          .boolean()
          .optional()
          .describe("Read each line as a string instead of JSON (--raw-input)"),
        exitStatus: z
          .boolean()
          .optional()
          .describe(
            "Use jq exit status for boolean checks: exit 1 if last output is false/null (--exit-status)",
          ),
        arg: z
          .record(z.string(), z.string())
          .optional()
          .describe(
            "Named string variables for parameterized expressions (maps to repeated --arg NAME VALUE)",
          ),
        argjson: z
          .record(z.string(), z.string())
          .optional()
          .describe(
            "Named JSON variables for parameterized expressions (maps to repeated --argjson NAME VALUE)",
          ),
        indent: z.number().optional().describe("Number of spaces for indentation (--indent)"),
        joinOutput: z
          .boolean()
          .optional()
          .describe("Don't print newlines between outputs (--join-output)"),
        compact: z.boolean().optional().default(true).describe("Prefer compact output"),
      },
      outputSchema: JqResultSchema,
    },
    async ({
      expression,
      file,
      input,
      rawOutput,
      sortKeys,
      nullInput,
      slurp,
      compactOutput,
      rawInput,
      exitStatus,
      arg,
      argjson,
      indent,
      joinOutput,
      compact,
    }) => {
      assertNoFlagInjection(expression, "expression");
      if (file) assertNoFlagInjection(file, "file");

      if (!file && !input && !nullInput) {
        const data = parseJqOutput(
          "",
          "Either 'file', 'input', or 'nullInput' must be provided.",
          1,
        );
        const rawText = "jq: error — either 'file', 'input', or 'nullInput' must be provided.";
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
      if (nullInput) args.push("--null-input");
      if (slurp) args.push("--slurp");
      if (compactOutput) args.push("--compact-output");
      if (rawInput) args.push("--raw-input");
      if (exitStatus) args.push("--exit-status");
      if (indent !== undefined) args.push("--indent", String(indent));
      if (joinOutput) args.push("--join-output");

      // Add named string variables
      if (arg) {
        for (const [name, value] of Object.entries(arg)) {
          args.push("--arg", name, value);
        }
      }

      // Add named JSON variables
      if (argjson) {
        for (const [name, value] of Object.entries(argjson)) {
          args.push("--argjson", name, value);
        }
      }

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
