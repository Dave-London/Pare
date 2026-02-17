import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { compactDualOutput, assertNoFlagInjection, INPUT_LIMITS } from "@paretools/shared";
import { tsc } from "../lib/build-runner.js";
import { parseTscOutput } from "../lib/parsers.js";
import { formatTsc, compactTscMap, formatTscCompact } from "../lib/formatters.js";
import { TscResultSchema } from "../schemas/index.js";

/** Registers the `tsc` tool on the given MCP server. */
export function registerTscTool(server: McpServer) {
  server.registerTool(
    "tsc",
    {
      title: "TypeScript Check",
      description:
        "Runs the TypeScript compiler and returns structured diagnostics (file, line, column, code, message). Use instead of running `tsc` in the terminal. " +
        "Note: In compact mode, diagnostics are trimmed to file, line, and code — column and message fields are omitted to save tokens.",
      inputSchema: {
        path: z
          .string()
          .max(INPUT_LIMITS.PATH_MAX)
          .optional()
          .describe("Project root path (default: cwd)"),
        noEmit: z
          .boolean()
          .optional()
          .default(true)
          .describe("Skip emitting output files (default: true)"),
        listEmittedFiles: z
          .boolean()
          .optional()
          .describe(
            "List emitted output files when emit is enabled (maps to --listEmittedFiles). Default: true when noEmit=false.",
          ),
        project: z.string().max(INPUT_LIMITS.PATH_MAX).optional().describe("Path to tsconfig.json"),
        incremental: z
          .boolean()
          .optional()
          .describe(
            "Enable incremental compilation for faster repeated checks (maps to --incremental)",
          ),
        skipLibCheck: z
          .boolean()
          .optional()
          .describe(
            "Skip type checking of declaration files for faster feedback (maps to --skipLibCheck)",
          ),
        emitDeclarationOnly: z
          .boolean()
          .optional()
          .describe(
            "Only emit .d.ts declaration files without JS output (maps to --emitDeclarationOnly)",
          ),
        declaration: z
          .boolean()
          .optional()
          .describe("Generate .d.ts declaration files (maps to --declaration)"),
        declarationDir: z
          .string()
          .max(INPUT_LIMITS.PATH_MAX)
          .optional()
          .describe(
            "Output directory for .d.ts declaration files (maps to --declarationDir). Use with --declaration.",
          ),
        pretty: z
          .boolean()
          .optional()
          .describe(
            "Enable or disable pretty-printed output (maps to --pretty). Set false for normalized parser-friendly output.",
          ),
        compact: z
          .boolean()
          .optional()
          .default(true)
          .describe(
            "Auto-compact when structured output exceeds raw CLI tokens. Set false to always get full schema.",
          ),
      },
      outputSchema: TscResultSchema,
    },
    async ({
      path,
      noEmit,
      listEmittedFiles,
      project,
      incremental,
      skipLibCheck,
      emitDeclarationOnly,
      declaration,
      declarationDir,
      pretty,
      compact,
    }) => {
      const cwd = path || process.cwd();
      if (project) assertNoFlagInjection(project, "project");
      if (declarationDir) assertNoFlagInjection(declarationDir, "declarationDir");

      const args: string[] = [];
      if (noEmit !== false) args.push("--noEmit");
      if (noEmit === false && listEmittedFiles !== false) args.push("--listEmittedFiles");
      if (project) args.push("--project", project);
      if (incremental) args.push("--incremental");
      if (skipLibCheck) args.push("--skipLibCheck");
      if (emitDeclarationOnly) args.push("--emitDeclarationOnly");
      if (declaration) args.push("--declaration");
      if (declarationDir) args.push("--declarationDir", declarationDir);
      if (pretty === false) args.push("--pretty", "false");

      const result = await tsc(args, cwd);
      const rawOutput = result.stdout + "\n" + result.stderr;
      const data = parseTscOutput(result.stdout, result.stderr, result.exitCode);
      return compactDualOutput(
        data,
        rawOutput,
        formatTsc,
        compactTscMap,
        formatTscCompact,
        compact === false,
      );
    },
  );
}
