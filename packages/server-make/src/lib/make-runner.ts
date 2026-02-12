import { run, type RunResult } from "@paretools/shared";
import { existsSync } from "node:fs";
import { join } from "node:path";

export type MakeTool = "make" | "just";

/**
 * Auto-detects the task runner to use based on the presence of task files.
 * Checks for Justfile/justfile first (use `just`), then falls back to `make`.
 */
export function detectTool(cwd: string): MakeTool {
  if (existsSync(join(cwd, "Justfile")) || existsSync(join(cwd, "justfile"))) {
    return "just";
  }
  return "make";
}

/**
 * Resolves the tool to use: if "auto", detect from the filesystem; otherwise use the specified tool.
 */
export function resolveTool(tool: "auto" | "make" | "just", cwd: string): MakeTool {
  if (tool === "auto") return detectTool(cwd);
  return tool;
}

/** Runs a `make` command with the given arguments. */
export async function makeCmd(args: string[], cwd?: string): Promise<RunResult> {
  return run("make", args, { cwd, timeout: 300_000 });
}

/** Runs a `just` command with the given arguments. */
export async function justCmd(args: string[], cwd?: string): Promise<RunResult> {
  return run("just", args, { cwd, timeout: 300_000 });
}
