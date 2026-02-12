import type { MakeRunResult, MakeListResult } from "../schemas/index.js";
import type { MakeTool } from "./make-runner.js";

/**
 * Parses the output of a `make` or `just` run into structured result data.
 */
export function parseRunOutput(
  target: string,
  stdout: string,
  stderr: string,
  exitCode: number,
  duration: number,
  tool: MakeTool,
): MakeRunResult {
  return {
    target,
    success: exitCode === 0,
    exitCode,
    stdout: stdout.trimEnd() || undefined,
    stderr: stderr.trimEnd() || undefined,
    duration,
    tool,
  };
}

/**
 * Parses `just --list` output into structured target data.
 *
 * Expected format:
 * ```
 * Available recipes:
 *     build  # Build the project
 *     test   # Run tests
 *     clean
 * ```
 */
export function parseJustList(stdout: string): {
  targets: { name: string; description?: string }[];
  total: number;
} {
  const targets: { name: string; description?: string }[] = [];

  for (const line of stdout.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("Available")) continue;

    const match = trimmed.match(/^(\S+)\s*(?:#\s*(.+))?$/);
    if (match) {
      targets.push({
        name: match[1],
        description: match[2]?.trim() || undefined,
      });
    }
  }

  return { targets, total: targets.length };
}

/**
 * Parses `make -pRrq` database output to extract user-defined target names.
 *
 * The make database output contains lines like:
 * ```
 * target-name: dependency1 dependency2
 * # Not a target
 * .PHONY: ...
 * ```
 *
 * We extract lines matching `^[a-zA-Z0-9_-]+:` that are not built-in targets
 * (starting with `.`) and not comments.
 */
export function parseMakeTargets(stdout: string): { targets: { name: string }[]; total: number } {
  const targets: { name: string }[] = [];
  const seen = new Set<string>();

  // The make -pRrq output includes a "# Files" section followed by rules.
  // Target lines appear as: "targetname: deps" or "targetname:"
  const targetRe = /^([a-zA-Z0-9_][a-zA-Z0-9_.\-/]*):/;

  for (const line of stdout.split("\n")) {
    // Skip comments and empty lines
    if (line.startsWith("#") || line.startsWith("\t") || !line.trim()) continue;

    const match = line.match(targetRe);
    if (match) {
      const name = match[1];
      // Skip built-in/special targets (start with .) and Makefile itself
      if (name.startsWith(".") || name === "Makefile" || name === "makefile") continue;
      if (!seen.has(name)) {
        seen.add(name);
        targets.push({ name });
      }
    }
  }

  return { targets, total: targets.length };
}

/**
 * Builds a full MakeListResult from parsed target data and the detected tool.
 */
export function buildListResult(
  parsed: { targets: { name: string; description?: string }[]; total: number },
  tool: MakeTool,
): MakeListResult {
  return {
    targets: parsed.targets,
    total: parsed.total,
    tool,
  };
}
