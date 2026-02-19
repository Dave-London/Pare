import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  compactDualOutput,
  assertNoFlagInjection,
  INPUT_LIMITS,
  compactInput,
  projectPathInput,
  configInput,
} from "@paretools/shared";
import { mypy } from "../lib/python-runner.js";
import { parseMypyJsonOutput } from "../lib/parsers.js";
import { formatMypy, compactMypyMap, formatMypyCompact } from "../lib/formatters.js";
import { MypyResultSchema } from "../schemas/index.js";

/** Registers the `mypy` tool on the given MCP server. */
export function registerMypyTool(server: McpServer) {
  server.registerTool(
    "mypy",
    {
      title: "mypy Type Check",
      description:
        "Runs mypy and returns structured type-check diagnostics (file, line, severity, message, code).",
      inputSchema: {
        path: projectPathInput,
        targets: z
          .array(z.string().max(INPUT_LIMITS.PATH_MAX))
          .max(INPUT_LIMITS.ARRAY_MAX)
          .optional()
          .default(["."])
          .describe("Files or directories to check (default: ['.'])"),
        strict: z
          .boolean()
          .optional()
          .default(false)
          .describe("Enable strict mode for thorough type checking (--strict)"),
        ignoreMissingImports: z
          .boolean()
          .optional()
          .default(false)
          .describe(
            "Suppress errors about missing imports for projects with incomplete stubs (--ignore-missing-imports)",
          ),
        noIncremental: z
          .boolean()
          .optional()
          .default(false)
          .describe("Disable incremental mode (--no-incremental)"),
        configFile: configInput("Path to mypy config file (--config-file)"),
        pythonVersion: z
          .string()
          .max(INPUT_LIMITS.SHORT_STRING_MAX)
          .optional()
          .describe("Python version to target (e.g. '3.11')"),
        exclude: z
          .string()
          .max(INPUT_LIMITS.STRING_MAX)
          .optional()
          .describe("Regular expression to exclude files/directories"),
        followImports: z
          .enum(["normal", "silent", "skip", "error"])
          .optional()
          .describe("How to handle imports (normal/silent/skip/error)"),
        module: z
          .string()
          .max(INPUT_LIMITS.SHORT_STRING_MAX)
          .optional()
          .describe("Specific module to type-check (-m MODULE)"),
        package: z
          .string()
          .max(INPUT_LIMITS.SHORT_STRING_MAX)
          .optional()
          .describe("Specific package to type-check (-p PACKAGE)"),
        installTypes: z
          .boolean()
          .optional()
          .describe("Auto-install missing type stubs (--install-types --non-interactive)"),
        disallowUntypedDefs: z
          .boolean()
          .optional()
          .default(false)
          .describe(
            "Disallow defining functions without type annotations (--disallow-untyped-defs)",
          ),
        disallowIncompleteDefs: z
          .boolean()
          .optional()
          .default(false)
          .describe("Disallow partially typed function definitions (--disallow-incomplete-defs)"),
        disallowUntypedCalls: z
          .boolean()
          .optional()
          .default(false)
          .describe(
            "Disallow calling untyped functions from typed contexts (--disallow-untyped-calls)",
          ),
        disallowAnyGenerics: z
          .boolean()
          .optional()
          .default(false)
          .describe(
            "Disallow usage of generic types without explicit parameters (--disallow-any-generics)",
          ),
        warnReturnAny: z
          .boolean()
          .optional()
          .default(false)
          .describe("Warn about returning values of type Any (--warn-return-any)"),
        warnUnusedIgnores: z
          .boolean()
          .optional()
          .default(false)
          .describe("Warn about unnecessary # type: ignore comments (--warn-unused-ignores)"),
        warnRedundantCasts: z
          .boolean()
          .optional()
          .default(false)
          .describe("Warn about redundant type casts (--warn-redundant-casts)"),
        warnUnreachable: z
          .boolean()
          .optional()
          .default(false)
          .describe("Warn about statically unreachable code (--warn-unreachable)"),
        compact: compactInput,
      },
      outputSchema: MypyResultSchema,
    },
    async (input) => {
      const path = input["path"] as string | undefined;
      const targets = input["targets"] as string[] | undefined;
      const strict = input["strict"] as boolean | undefined;
      const ignoreMissingImports = input["ignoreMissingImports"] as boolean | undefined;
      const noIncremental = input["noIncremental"] as boolean | undefined;
      const configFile = input["configFile"] as string | undefined;
      const pythonVersion = input["pythonVersion"] as string | undefined;
      const exclude = input["exclude"] as string | undefined;
      const followImports = input["followImports"] as string | undefined;
      const mod = input["module"] as string | undefined;
      const pkg = input["package"] as string | undefined;
      const installTypes = input["installTypes"] as boolean | undefined;
      const disallowUntypedDefs = input["disallowUntypedDefs"] as boolean | undefined;
      const disallowIncompleteDefs = input["disallowIncompleteDefs"] as boolean | undefined;
      const disallowUntypedCalls = input["disallowUntypedCalls"] as boolean | undefined;
      const disallowAnyGenerics = input["disallowAnyGenerics"] as boolean | undefined;
      const warnReturnAny = input["warnReturnAny"] as boolean | undefined;
      const warnUnusedIgnores = input["warnUnusedIgnores"] as boolean | undefined;
      const warnRedundantCasts = input["warnRedundantCasts"] as boolean | undefined;
      const warnUnreachable = input["warnUnreachable"] as boolean | undefined;
      const compact = input["compact"] as boolean | undefined;

      const cwd = path || process.cwd();
      for (const t of targets ?? []) {
        assertNoFlagInjection(t, "targets");
      }
      if (configFile) assertNoFlagInjection(configFile, "configFile");
      if (pythonVersion) assertNoFlagInjection(pythonVersion, "pythonVersion");
      if (exclude) assertNoFlagInjection(exclude, "exclude");
      if (mod) assertNoFlagInjection(mod, "module");
      if (pkg) assertNoFlagInjection(pkg, "package");

      // Use --output json for structured output; falls back to text parsing on older mypy
      const args: string[] = ["--output", "json"];

      // Config and version options
      if (configFile) args.push("--config-file", configFile);
      if (pythonVersion) args.push("--python-version", pythonVersion);
      if (exclude) args.push("--exclude", exclude);
      if (followImports) args.push("--follow-imports", followImports);
      if (installTypes) args.push("--install-types", "--non-interactive");
      if (strict) args.push("--strict");
      if (ignoreMissingImports) args.push("--ignore-missing-imports");
      if (noIncremental) args.push("--no-incremental");
      if (disallowUntypedDefs) args.push("--disallow-untyped-defs");
      if (disallowIncompleteDefs) args.push("--disallow-incomplete-defs");
      if (disallowUntypedCalls) args.push("--disallow-untyped-calls");
      if (disallowAnyGenerics) args.push("--disallow-any-generics");
      if (warnReturnAny) args.push("--warn-return-any");
      if (warnUnusedIgnores) args.push("--warn-unused-ignores");
      if (warnRedundantCasts) args.push("--warn-redundant-casts");
      if (warnUnreachable) args.push("--warn-unreachable");

      // Target selection: module > package > file targets
      if (mod) {
        args.push("-m", mod);
      } else if (pkg) {
        args.push("-p", pkg);
      } else {
        args.push(...(targets || ["."]));
      }

      const result = await mypy(args, cwd);
      const data = parseMypyJsonOutput(result.stdout, result.exitCode);
      return compactDualOutput(
        data,
        result.stdout,
        formatMypy,
        compactMypyMap,
        formatMypyCompact,
        compact === false,
      );
    },
  );
}
