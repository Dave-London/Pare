import type { MakeRunResultInternal, MakeListResultInternal } from "../schemas/index.js";
import type { MakeTool } from "./make-runner.js";

function detectRunErrorType(
  tool: MakeTool,
  stdout: string,
  stderr: string,
): "missing-target" | "recipe-failure" | "parse-error" | undefined {
  const text = `${stderr}\n${stdout}`.toLowerCase();

  if (
    text.includes("no rule to make target") ||
    text.includes("justfile does not contain recipe") ||
    text.includes("unknown recipe")
  ) {
    return "missing-target";
  }

  if (
    text.includes("missing separator") ||
    text.includes("makefile parse error") ||
    text.includes("error parsing")
  ) {
    return "parse-error";
  }

  if (
    text.includes("recipe for target") ||
    text.includes("error ") ||
    text.includes("recipe failed") ||
    (tool === "just" && text.includes("exited with status code"))
  ) {
    return "recipe-failure";
  }

  return undefined;
}

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
  timedOut: boolean = false,
): MakeRunResultInternal {
  const success = exitCode === 0 && !timedOut;
  return {
    target,
    success,
    exitCode,
    stdout: stdout.trimEnd() || undefined,
    stderr: stderr.trimEnd() || undefined,
    duration,
    tool,
    timedOut,
    errorType: !success ? detectRunErrorType(tool, stdout, stderr) : undefined,
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

/** Shape returned by `just --dump-format json`. */
export interface JustDumpRecipe {
  name?: string;
  doc?: string | null;
  parameters?: Array<{ name: string; default?: string | null }>;
  dependencies?: Array<{ recipe: string } | string>;
  body?: unknown;
}

export interface JustDump {
  recipes?: Record<string, JustDumpRecipe>;
  aliases?: Record<string, { target: string }>;
}

/**
 * Parses `just --dump-format json` output into structured target data.
 *
 * The JSON dump includes recipe names, parameters, dependencies, and docs.
 * All just recipes are inherently phony (no file targets).
 */
export function parseJustDumpJson(
  jsonOutput: string,
  opts?: { showRecipe?: boolean },
): {
  targets: {
    name: string;
    description?: string;
    isPhony?: boolean;
    dependencies?: string[];
    recipe?: string[];
  }[];
  total: number;
} {
  const dump: JustDump = JSON.parse(jsonOutput);
  const targets: {
    name: string;
    description?: string;
    isPhony?: boolean;
    dependencies?: string[];
    recipe?: string[];
  }[] = [];

  if (dump.recipes) {
    for (const [recipeName, recipe] of Object.entries(dump.recipes)) {
      const deps: string[] = [];
      if (recipe.dependencies && recipe.dependencies.length > 0) {
        for (const dep of recipe.dependencies) {
          if (typeof dep === "string") {
            deps.push(dep);
          } else if (dep && typeof dep === "object" && "recipe" in dep) {
            deps.push(dep.recipe);
          }
        }
      }

      targets.push({
        name: recipeName,
        description: recipe.doc?.trim() || undefined,
        isPhony: true,
        dependencies: deps.length > 0 ? deps : undefined,
        recipe:
          opts?.showRecipe && Array.isArray(recipe.body)
            ? recipe.body.filter((line): line is string => typeof line === "string")
            : undefined,
      });
    }
  }

  // Sort alphabetically by default (consistent with just --list default)
  targets.sort((a, b) => a.name.localeCompare(b.name));

  return { targets, total: targets.length };
}

/**
 * Strips order-only dependencies from a make dependency list.
 * In make, `target: normal_dep1 | order_only_dep` — everything after `|` is order-only.
 * We only return dependencies before the `|` separator.
 */
function stripOrderOnlyDeps(tokens: string[]): string[] {
  const result: string[] = [];
  for (const token of tokens) {
    if (token === "|") break;
    if (token.length > 0) result.push(token);
  }
  return result;
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
export function parseMakeTargets(stdout: string): {
  targets: { name: string; description?: string; dependencies?: string[] }[];
  total: number;
} {
  const targets: { name: string; description?: string; dependencies?: string[] }[] = [];
  const seen = new Set<string>();

  // The make -pRrq output includes a "# Files" section followed by rules.
  // Target lines appear as: "targetname: deps" or "targetname:"
  const targetRe = /^([a-zA-Z0-9_][a-zA-Z0-9_.\-/]*):\s*(.*)/;

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
        // Parse dependencies from the right side of ":"
        const depsStr = match[2].trim();
        const tokens = depsStr ? depsStr.split(/\s+/) : [];
        const deps = stripOrderOnlyDeps(tokens);
        targets.push({
          name,
          dependencies: deps.length > 0 ? deps : undefined,
        });
      }
    }
  }

  return { targets, total: targets.length };
}

/**
 * Parses `.PHONY` declarations from Makefile source to determine which targets are phony.
 *
 * @param makefileSource - Raw contents of the Makefile
 * @returns Set of target names declared as .PHONY
 */
export function parsePhonyTargets(makefileSource: string): Set<string> {
  const phonySet = new Set<string>();
  const phonyRe = /^\.PHONY\s*:\s*(.+)$/;

  for (const line of makefileSource.split("\n")) {
    const trimmed = line.trim();
    const match = trimmed.match(phonyRe);
    if (match) {
      const names = match[1].split(/\s+/).filter((n) => n.length > 0);
      for (const name of names) {
        phonySet.add(name);
      }
    }
  }

  return phonySet;
}

/**
 * Enriches targets with isPhony flag based on .PHONY declarations.
 *
 * @param targets - Targets previously extracted from `make -pRrq` output
 * @param phonySet - Set of phony target names from parsePhonyTargets
 * @returns The same targets array, mutated with `isPhony` fields where applicable
 */
export function enrichPhonyFlags(
  targets: {
    name: string;
    description?: string;
    isPhony?: boolean;
    dependencies?: string[];
    recipe?: string[];
  }[],
  phonySet: Set<string>,
): void {
  for (const target of targets) {
    if (phonySet.has(target.name)) {
      target.isPhony = true;
    }
  }
}

/**
 * Enriches parsed make targets with descriptions extracted from the Makefile source.
 *
 * Supports the common `target: [deps] ## Description text` convention where a
 * double-hash comment at the end of the target rule line serves as documentation.
 * This convention is widely used in Makefiles that provide a `help` target.
 *
 * @param targets - Targets previously extracted from `make -pRrq` output
 * @param makefileSource - Raw contents of the Makefile
 * @returns The same targets array, mutated with `description` fields where found
 */
export function enrichMakeTargetDescriptions(
  targets: { name: string; description?: string; recipe?: string[] }[],
  makefileSource: string,
): { name: string; description?: string; recipe?: string[] }[] {
  // Build a map of target name → description from lines matching: target: ... ## desc
  const descMap = new Map<string, string>();
  // Match: targetname: [anything] ## description
  const descRe = /^([a-zA-Z0-9_][a-zA-Z0-9_.\-/]*):[^#]*##\s*(.+)$/;

  for (const line of makefileSource.split("\n")) {
    const match = line.match(descRe);
    if (match) {
      const name = match[1];
      const desc = match[2].trim();
      if (desc) {
        descMap.set(name, desc);
      }
    }
  }

  // Enrich targets with descriptions
  for (const target of targets) {
    const desc = descMap.get(target.name);
    if (desc) {
      target.description = desc;
    }
  }

  return targets;
}

/**
 * Parses dependency lists from Makefile source for best-effort dependency enrichment.
 * This extracts dependencies from `target: dep1 dep2` lines in the Makefile source
 * (not the make database output), providing cleaner results for user-defined rules.
 */
export function parseMakeDependencies(makefileSource: string): Map<string, string[]> {
  const depMap = new Map<string, string[]>();
  const depRe = /^([a-zA-Z0-9_][a-zA-Z0-9_.\-/]*):\s*([^#\n]*)/;

  for (const line of makefileSource.split("\n")) {
    const match = line.match(depRe);
    if (match) {
      const name = match[1];
      const depsStr = match[2].trim();
      if (depsStr) {
        const tokens = depsStr.split(/\s+/);
        const deps = stripOrderOnlyDeps(tokens);
        if (deps.length > 0) {
          depMap.set(name, deps);
        }
      }
    }
  }

  return depMap;
}

/**
 * Parses explicit target recipe bodies from Makefile source.
 *
 * Captures tab-indented command lines that immediately follow target rules.
 * Pattern rules (`%.o: %.c`) are excluded here and returned via parsePatternRules.
 */
export function parseMakeRecipes(makefileSource: string): Map<string, string[]> {
  const recipeMap = new Map<string, string[]>();
  const lines = makefileSource.split("\n");
  const targetRe = /^([a-zA-Z0-9_][a-zA-Z0-9_.\-/]*):\s*([^#\n]*)/;

  let currentTarget: string | undefined;
  for (const line of lines) {
    const match = line.match(targetRe);
    if (match && !line.trimStart().startsWith(".PHONY")) {
      currentTarget = match[1];
      if (!recipeMap.has(currentTarget)) {
        recipeMap.set(currentTarget, []);
      }
      continue;
    }

    if (line.startsWith("\t") && currentTarget) {
      const cmd = line.trim();
      if (cmd.length > 0) {
        recipeMap.get(currentTarget)?.push(cmd);
      }
      continue;
    }

    if (line.trim().length > 0) {
      currentTarget = undefined;
    }
  }

  for (const [target, recipe] of recipeMap.entries()) {
    if (recipe.length === 0) {
      recipeMap.delete(target);
    }
  }

  return recipeMap;
}

/**
 * Parses Makefile pattern rules (e.g., `%.o: %.c`) with optional recipes.
 */
export function parsePatternRules(makefileSource: string): {
  pattern: string;
  dependencies?: string[];
  recipe?: string[];
}[] {
  const lines = makefileSource.split("\n");
  const patternRe = /^([^\s:#]*%[^\s:#]*):\s*([^#\n]*)/;
  const rules: { pattern: string; dependencies?: string[]; recipe?: string[] }[] = [];

  let currentRule: { pattern: string; dependencies?: string[]; recipe?: string[] } | undefined;
  for (const line of lines) {
    const match = line.match(patternRe);
    if (match) {
      const depsStr = match[2].trim();
      const deps = depsStr ? stripOrderOnlyDeps(depsStr.split(/\s+/)) : [];
      currentRule = {
        pattern: match[1],
        dependencies: deps.length > 0 ? deps : undefined,
        recipe: [],
      };
      rules.push(currentRule);
      continue;
    }

    if (line.startsWith("\t") && currentRule) {
      const cmd = line.trim();
      if (cmd.length > 0) {
        currentRule.recipe?.push(cmd);
      }
      continue;
    }

    if (line.trim().length > 0) {
      currentRule = undefined;
    }
  }

  for (const rule of rules) {
    if ((rule.recipe ?? []).length === 0) {
      delete rule.recipe;
    }
  }

  return rules;
}

/**
 * Adds parsed recipe bodies to already-discovered make targets.
 */
export function enrichTargetRecipes(
  targets: { name: string; recipe?: string[] }[],
  recipeMap: Map<string, string[]>,
): void {
  for (const target of targets) {
    const recipe = recipeMap.get(target.name);
    if (recipe && recipe.length > 0) {
      target.recipe = recipe;
    }
  }
}

/**
 * Builds a full MakeListResult from parsed target data and the detected tool.
 */
export function buildListResult(
  parsed: {
    targets: {
      name: string;
      description?: string;
      isPhony?: boolean;
      dependencies?: string[];
      recipe?: string[];
    }[];
    patternRules?: { pattern: string; dependencies?: string[]; recipe?: string[] }[];
    total: number;
  },
  tool: MakeTool,
): MakeListResultInternal {
  return {
    targets: parsed.targets,
    total: parsed.total,
    tool,
    ...(parsed.patternRules ? { patternRules: parsed.patternRules } : {}),
  };
}
