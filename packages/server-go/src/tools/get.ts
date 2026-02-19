import { z } from "zod";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  compactDualOutput,
  assertNoFlagInjection,
  INPUT_LIMITS,
  compactInput,
  projectPathInput,
} from "@paretools/shared";
import { goCmd } from "../lib/go-runner.js";
import { parseGoGetOutput } from "../lib/parsers.js";
import { formatGoGet, compactGetMap, formatGetCompact } from "../lib/formatters.js";
import { GoGetResultSchema } from "../schemas/index.js";

/** Registers the `get` tool on the given MCP server. */
export function registerGetTool(server: McpServer) {
  server.registerTool(
    "get",
    {
      title: "Go Get",
      description: "Downloads and installs Go packages and their dependencies.",
      inputSchema: {
        packages: z
          .array(z.string().max(INPUT_LIMITS.SHORT_STRING_MAX))
          .max(INPUT_LIMITS.ARRAY_MAX)
          .describe("Packages to install (e.g., ['github.com/pkg/errors@latest'])"),
        path: projectPathInput,
        update: z
          .enum(["all", "patch"])
          .optional()
          .describe(
            "Update modules: 'all' maps to -u (update to latest), 'patch' maps to -u=patch (patch-level updates only)",
          ),
        testDeps: z
          .boolean()
          .optional()
          .default(false)
          .describe("Also download packages needed to build and test the specified packages (-t)"),
        verbose: z
          .boolean()
          .optional()
          .default(false)
          .describe("Print information about download and resolution progress (-v)"),
        downloadOnly: z
          .boolean()
          .optional()
          .default(false)
          .describe("Download the named packages but do not install them (-d)"),
        compact: compactInput,
      },
      outputSchema: GoGetResultSchema,
    },
    async ({ packages, path, update, testDeps, verbose, downloadOnly, compact }) => {
      const cwd = path || process.cwd();
      for (const p of packages) {
        assertNoFlagInjection(p, "packages");
      }
      const args = ["get"];
      if (update === "all") args.push("-u");
      else if (update === "patch") args.push("-u=patch");
      if (testDeps) args.push("-t");
      if (verbose) args.push("-v");
      if (downloadOnly) args.push("-d");
      args.push(...packages);
      const goModBefore = await readGoMod(cwd);
      const result = await goCmd(args, cwd);
      const goModAfter = await readGoMod(cwd);
      // Pass requestedPackages for per-package status tracking (Gap #153)
      const data = parseGoGetOutput(result.stdout, result.stderr, result.exitCode, packages);
      const goModChanges = diffGoModRequirements(goModBefore, goModAfter);
      if (goModChanges) {
        data.goModChanges = goModChanges;
      }
      const rawOutput = (result.stdout + "\n" + result.stderr).trim();
      return compactDualOutput(
        data,
        rawOutput,
        formatGoGet,
        compactGetMap,
        formatGetCompact,
        compact === false,
      );
    },
  );
}

async function readGoMod(cwd: string): Promise<string | undefined> {
  try {
    return await readFile(join(cwd, "go.mod"), "utf-8");
  } catch {
    return undefined;
  }
}

function diffGoModRequirements(
  before: string | undefined,
  after: string | undefined,
): { added: string[]; removed: string[] } | undefined {
  if (before === undefined || after === undefined) {
    return undefined;
  }

  const beforeSet = parseRequireSet(before);
  const afterSet = parseRequireSet(after);
  const added = [...afterSet].filter((r) => !beforeSet.has(r)).sort();
  const removed = [...beforeSet].filter((r) => !afterSet.has(r)).sort();

  if (added.length === 0 && removed.length === 0) {
    return undefined;
  }
  return { added, removed };
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
