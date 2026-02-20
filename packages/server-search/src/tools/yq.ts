import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  compactDualOutput,
  assertNoFlagInjection,
  INPUT_LIMITS,
  compactInput,
  pathInput,
} from "@paretools/shared";
import { yqCmd } from "../lib/search-runner.js";
import { parseYqOutput } from "../lib/parsers.js";
import { formatYq, compactYqMap, formatYqCompact } from "../lib/formatters.js";
import { YqResultSchema } from "../schemas/index.js";

/** Registers the `yq` tool on the given MCP server. */
export function registerYqTool(server: McpServer) {
  server.registerTool(
    "yq",
    {
      title: "YAML/JSON/XML/TOML Processor",
      description:
        "Processes and transforms YAML, JSON, XML, TOML, and properties files using yq expressions. Accepts input from a file path or inline string. Returns the transformed result.",
      inputSchema: {
        expression: z
          .string()
          .max(INPUT_LIMITS.STRING_MAX)
          .describe("yq expression (e.g., '.name', '.items[] | .id', 'select(.enabled == true)')"),
        file: pathInput("Path to an input file to process"),
        files: z
          .array(z.string().max(INPUT_LIMITS.STRING_MAX))
          .optional()
          .describe(
            "Multiple file paths for eval-all mode (evaluates expression across all files)",
          ),
        input: z
          .string()
          .max(INPUT_LIMITS.STRING_MAX)
          .optional()
          .describe("Inline YAML/JSON string to process (used when file is not provided)"),
        inputFormat: z
          .enum(["yaml", "json", "xml", "toml", "props"])
          .optional()
          .describe("Input format (-p flag). Defaults to yaml."),
        outputFormat: z
          .enum(["yaml", "json", "xml", "toml", "props", "csv", "tsv"])
          .optional()
          .describe("Output format (-o flag). Defaults to yaml."),
        inPlace: z
          .boolean()
          .optional()
          .default(false)
          .describe(
            "Edit file in-place (-i flag). DANGER: modifies the file. Requires explicit opt-in.",
          ),
        prettyPrint: z
          .boolean()
          .optional()
          .describe("Pretty print output (--prettyPrint / -P flag)"),
        noColors: z
          .boolean()
          .optional()
          .default(true)
          .describe("Disable color output (--no-colors / -M flag). Defaults to true."),
        nullInput: z
          .boolean()
          .optional()
          .describe(
            "Don't read any input, useful for generating YAML from scratch (--null-input / -n)",
          ),
        unwrapScalar: z
          .boolean()
          .optional()
          .describe("Unwrap scalar values (remove quotes from strings) (--unwrapScalar)"),
        evalAll: z
          .boolean()
          .optional()
          .describe("Evaluate expression across all files (eval-all mode)"),
        indent: z.number().optional().describe("Number of spaces for indentation (--indent)"),
        compact: compactInput,
      },
      outputSchema: YqResultSchema,
    },
    async ({
      expression,
      file,
      files,
      input,
      inputFormat,
      outputFormat,
      inPlace,
      prettyPrint,
      noColors,
      nullInput,
      unwrapScalar,
      evalAll,
      indent,
      compact,
    }) => {
      // Validate file paths but NOT expression (expressions can contain dashes)
      if (file) assertNoFlagInjection(file, "file");
      if (files) {
        for (const f of files) {
          assertNoFlagInjection(f, "files");
        }
      }

      if (!file && !files && !input && !nullInput) {
        const data = parseYqOutput(
          "",
          "Either 'file', 'files', 'input', or 'nullInput' must be provided.",
          1,
          outputFormat,
        );
        const rawText =
          "yq: error — either 'file', 'files', 'input', or 'nullInput' must be provided.";
        return compactDualOutput(
          data,
          rawText,
          formatYq,
          compactYqMap,
          formatYqCompact,
          compact === false,
        );
      }

      const args: string[] = [];

      if (noColors) args.push("--no-colors");
      if (inPlace) args.push("--inplace");
      if (prettyPrint) args.push("--prettyPrint");
      if (nullInput) args.push("--null-input");
      if (unwrapScalar !== undefined) args.push(`--unwrapScalar=${String(unwrapScalar)}`);
      if (indent !== undefined) args.push("--indent", String(indent));
      if (inputFormat) args.push("--input-format", inputFormat);
      if (outputFormat) args.push("--output-format", outputFormat);

      // Add expression
      args.push(expression);

      // Add file path(s)
      if (evalAll && files && files.length > 0) {
        args.push(...files);
      } else if (file) {
        args.push(file);
      }

      const result = await yqCmd(args, {
        stdin: !file && !files ? input : undefined,
      });

      const data = parseYqOutput(result.stdout, result.stderr, result.exitCode, outputFormat);
      const rawText = (result.stdout + "\n" + result.stderr).trim();

      return compactDualOutput(
        data,
        rawText,
        formatYq,
        compactYqMap,
        formatYqCompact,
        compact === false,
      );
    },
  );
}
