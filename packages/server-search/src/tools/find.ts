import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { compactDualOutput, assertNoFlagInjection, INPUT_LIMITS } from "@paretools/shared";
import { fdCmd } from "../lib/search-runner.js";
import { parseFdOutput } from "../lib/parsers.js";
import { formatFind, compactFindMap, formatFindCompact } from "../lib/formatters.js";
import { FindResultSchema } from "../schemas/index.js";

/** Registers the `find` tool on the given MCP server. */
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
        path: z.string().max(INPUT_LIMITS.PATH_MAX).optional().describe("Directory to search in"),
        type: z
          .enum(["file", "directory", "symlink", "executable", "empty"])
          .optional()
          .describe("Filter by entry type: file, directory, symlink, executable, or empty"),
        extension: z
          .string()
          .max(INPUT_LIMITS.SHORT_STRING_MAX)
          .optional()
          .describe("Filter by file extension (e.g., 'ts', 'js')"),
        exclude: z
          .string()
          .max(INPUT_LIMITS.SHORT_STRING_MAX)
          .optional()
          .describe(
            "Exclude entries matching this glob pattern (maps to --exclude, e.g., 'node_modules', 'dist')",
          ),
        size: z
          .string()
          .max(INPUT_LIMITS.SHORT_STRING_MAX)
          .optional()
          .describe(
            "Filter by file size (maps to --size, e.g., '+1m' for >1MB, '-100k' for <100KB)",
          ),
        changedWithin: z
          .string()
          .max(INPUT_LIMITS.SHORT_STRING_MAX)
          .optional()
          .describe(
            "Filter by modification time (maps to --changed-within, e.g., '1d', '2h', '30min')",
          ),
        maxResults: z
          .number()
          .optional()
          .default(1000)
          .describe("Maximum number of results to return (default: 1000)"),
        maxDepth: z.number().optional().describe("Maximum directory depth to search (--max-depth)"),
        hidden: z.boolean().optional().describe("Include hidden files and directories (--hidden)"),
        absolutePath: z
          .boolean()
          .optional()
          .describe("Return absolute paths instead of relative (--absolute-path)"),
        fullPath: z
          .boolean()
          .optional()
          .describe("Match pattern against full path, not just filename (--full-path)"),
        glob: z
          .boolean()
          .optional()
          .describe("Use glob pattern matching instead of regex (--glob)"),
        noIgnore: z
          .boolean()
          .optional()
          .describe("Don't respect .gitignore and other ignore files (--no-ignore)"),
        follow: z.boolean().optional().describe("Follow symbolic links (--follow)"),
        compact: z.boolean().optional().default(true).describe("Prefer compact output"),
      },
      outputSchema: FindResultSchema,
    },
    async ({
      pattern,
      path,
      type,
      extension,
      exclude,
      size,
      changedWithin,
      maxResults,
      maxDepth,
      hidden,
      absolutePath,
      fullPath,
      glob,
      noIgnore,
      follow,
      compact,
    }) => {
      if (pattern) assertNoFlagInjection(pattern, "pattern");
      if (path) assertNoFlagInjection(path, "path");
      if (extension) assertNoFlagInjection(extension, "extension");
      if (exclude) assertNoFlagInjection(exclude, "exclude");
      if (size) assertNoFlagInjection(size, "size");
      if (changedWithin) assertNoFlagInjection(changedWithin, "changedWithin");

      const cwd = path || process.cwd();
      const args = ["--color", "never"];

      if (type) {
        const typeMap = {
          file: "f",
          directory: "d",
          symlink: "l",
          executable: "x",
          empty: "e",
        } as const;
        args.push("--type", typeMap[type]);
      }

      if (extension) {
        args.push("--extension", extension);
      }

      if (exclude) {
        args.push("--exclude", exclude);
      }

      if (size) {
        args.push("--size", size);
      }

      if (changedWithin) {
        args.push("--changed-within", changedWithin);
      }

      if (maxResults) {
        args.push("--max-results", String(maxResults));
      }

      if (maxDepth !== undefined) {
        args.push("--max-depth", String(maxDepth));
      }

      if (hidden) {
        args.push("--hidden");
      }

      if (absolutePath) {
        args.push("--absolute-path");
      }

      if (fullPath) {
        args.push("--full-path");
      }

      if (glob) {
        args.push("--glob");
      }

      if (noIgnore) {
        args.push("--no-ignore");
      }

      if (follow) {
        args.push("--follow");
      }

      if (pattern) {
        args.push(pattern);
      }

      const result = await fdCmd(args, cwd);
      const data = parseFdOutput(result.stdout, maxResults ?? 1000, cwd);
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
