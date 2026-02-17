import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { compactDualOutput, assertNoFlagInjection, INPUT_LIMITS } from "@paretools/shared";
import { fdCmd } from "../lib/search-runner.js";
import { parseFdOutput } from "../lib/parsers.js";
import { formatFind, compactFindMap, formatFindCompact } from "../lib/formatters.js";
import { FindResultSchema } from "../schemas/index.js";

export function registerFindTool(server: McpServer) {
  server.registerTool(
    "find",
    {
      title: "Find Files",
      description:
        "Finds files and directories using fd with structured output. Returns file paths, names, and extensions.",
      inputSchema: {
        pattern: z
          .string()
          .max(INPUT_LIMITS.STRING_MAX)
          .optional()
          .describe("Regex pattern to match file/directory names"),
        path: z
          .string()
          .max(INPUT_LIMITS.PATH_MAX)
          .optional()
          .describe("Directory to search in (default: cwd)"),
        type: z
          .enum(["file", "directory", "symlink"])
          .optional()
          .describe("Filter by entry type: file, directory, or symlink"),
        extension: z
          .string()
          .max(INPUT_LIMITS.SHORT_STRING_MAX)
          .optional()
          .describe("Filter by file extension (e.g., 'ts', 'js')"),
        maxResults: z
          .number()
          .optional()
          .default(1000)
          .describe("Maximum number of results to return (default: 1000)"),
        compact: z
          .boolean()
          .optional()
          .default(true)
          .describe(
            "Prefer compact output",
          ),
      },
      outputSchema: FindResultSchema,
    },
    async ({ pattern, path, type, extension, maxResults, compact }) => {
      if (pattern) assertNoFlagInjection(pattern, "pattern");
      if (path) assertNoFlagInjection(path, "path");
      if (extension) assertNoFlagInjection(extension, "extension");

      const cwd = path || process.cwd();
      const args = ["--color", "never"];

      if (type) {
        const typeMap = { file: "f", directory: "d", symlink: "l" } as const;
        args.push("--type", typeMap[type]);
      }

      if (extension) {
        args.push("--extension", extension);
      }

      if (maxResults) {
        args.push("--max-results", String(maxResults));
      }

      if (pattern) {
        args.push(pattern);
      }

      const result = await fdCmd(args, cwd);
      const data = parseFdOutput(result.stdout, maxResults ?? 1000);
      const rawOutput = (result.stdout + "\n" + result.stderr).trim();

      return compactDualOutput(
        data,
        rawOutput,
        formatFind,
        compactFindMap,
        formatFindCompact,
        compact === false,
      );
    },
  );
}
