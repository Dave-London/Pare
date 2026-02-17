import { z } from "zod";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { compactDualOutput, assertNoFlagInjection, INPUT_LIMITS } from "@paretools/shared";
import { goCmd } from "../lib/go-runner.js";
import { parseGoModTidyOutput } from "../lib/parsers.js";
import { formatGoModTidy, compactModTidyMap, formatModTidyCompact } from "../lib/formatters.js";
import { GoModTidyResultSchema } from "../schemas/index.js";

/** Compute a quick hash of a file's contents, or return undefined if the file doesn't exist. */
async function hashFile(filePath: string): Promise<string | undefined> {
  try {
    const content = await readFile(filePath);
    return createHash("md5").update(content).digest("hex");
  } catch {
    return undefined;
  }
}

/** Registers the `mod-tidy` tool on the given MCP server. */
export function registerModTidyTool(server: McpServer) {
  server.registerTool(
    "mod-tidy",
    {
      title: "Go Mod Tidy",
      description: "Runs go mod tidy to add missing and remove unused module dependencies.",
      inputSchema: {
        path: z.string().max(INPUT_LIMITS.PATH_MAX).optional().describe("Project root path"),
        diff: z
          .boolean()
          .optional()
          .default(false)
          .describe(
            "Non-destructive check mode: show what changes would be made without modifying files (-diff)",
          ),
        verbose: z
          .boolean()
          .optional()
          .default(false)
          .describe("Print information about removed modules (-v)"),
        continueOnError: z
          .boolean()
          .optional()
          .default(false)
          .describe("Attempt to proceed despite errors encountered while loading packages (-e)"),
        goVersion: z
          .string()
          .max(INPUT_LIMITS.SHORT_STRING_MAX)
          .optional()
          .describe("Set the expected Go language version (-go=<version>). Example: '1.21'"),
        compat: z
          .string()
          .max(INPUT_LIMITS.SHORT_STRING_MAX)
          .optional()
          .describe(
            "Preserve backward compatibility with the specified Go version (-compat=<version>). Example: '1.20'",
          ),
        compact: z.boolean().optional().default(true).describe("Prefer compact output"),
      },
      outputSchema: GoModTidyResultSchema,
    },
    async ({ path, diff, verbose, continueOnError, goVersion, compat, compact }) => {
      const cwd = path || process.cwd();
      if (goVersion) assertNoFlagInjection(goVersion, "goVersion");
      if (compat) assertNoFlagInjection(compat, "compat");

      // Hash go.mod and go.sum before tidy to detect changes (Gap #156)
      const goModPath = join(cwd, "go.mod");
      const goSumPath = join(cwd, "go.sum");
      const [goModHashBefore, goSumHashBefore] = await Promise.all([
        hashFile(goModPath),
        hashFile(goSumPath),
      ]);
      const goModBefore = await readGoMod(goModPath);

      const args = ["mod", "tidy"];
      if (diff) args.push("-diff");
      if (verbose) args.push("-v");
      if (continueOnError) args.push("-e");
      if (goVersion) args.push(`-go=${goVersion}`);
      if (compat) args.push(`-compat=${compat}`);
      const result = await goCmd(args, cwd);

      // Hash go.mod and go.sum after tidy
      const [goModHashAfter, goSumHashAfter] = await Promise.all([
        hashFile(goModPath),
        hashFile(goSumPath),
      ]);
      const goModAfter = await readGoMod(goModPath);
      const { addedModules, removedModules } = diffGoModRequirements(goModBefore, goModAfter);

      const data = parseGoModTidyOutput(
        result.stdout,
        result.stderr,
        result.exitCode,
        goModHashBefore,
        goModHashAfter,
        goSumHashBefore,
        goSumHashAfter,
        addedModules,
        removedModules,
      );
      const rawOutput = (result.stdout + "\n" + result.stderr).trim();
      return compactDualOutput(
        data,
        rawOutput,
        formatGoModTidy,
        compactModTidyMap,
        formatModTidyCompact,
        compact === false,
      );
    },
  );
}

async function readGoMod(goModPath: string): Promise<string | undefined> {
  try {
    return await readFile(goModPath, "utf-8");
  } catch {
    return undefined;
  }
}

function diffGoModRequirements(
  before: string | undefined,
  after: string | undefined,
): { addedModules: string[]; removedModules: string[] } {
  if (before === undefined || after === undefined) {
    return { addedModules: [], removedModules: [] };
  }
  const beforeSet = parseRequireSet(before);
  const afterSet = parseRequireSet(after);
  return {
    addedModules: [...afterSet].filter((r) => !beforeSet.has(r)).sort(),
    removedModules: [...beforeSet].filter((r) => !afterSet.has(r)).sort(),
  };
}

function parseRequireSet(goMod: string): Set<string> {
  const result = new Set<string>();
  let inBlock = false;

  for (const rawLine of goMod.split("\n")) {
    const line = rawLine.trim();
    if (!line || line.startsWith("//")) continue;

    if (line.startsWith("require (")) {
      inBlock = true;
      continue;
    }
    if (inBlock && line === ")") {
      inBlock = false;
      continue;
    }

    const target = inBlock
      ? line
      : line.startsWith("require ")
        ? line.slice("require ".length)
        : "";
    if (!target) continue;
    const cleaned = target.replace(/\s+\/\/.*$/, "").trim();
    if (cleaned) result.add(cleaned);
  }
  return result;
}
