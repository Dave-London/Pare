import { run, type RunResult } from "@paretools/shared";
import type { PackageManager } from "./detect-pm.js";

function isLongRunning(args: string[]): boolean {
  const cmd = args[0];
  return (
    cmd === "install" ||
    cmd === "i" ||
    cmd === "ci" ||
    cmd === "run" ||
    cmd === "run-script" ||
    cmd === "test" ||
    cmd === "t" ||
    cmd === "add"
  );
}

export async function npm(args: string[], cwd?: string): Promise<RunResult> {
  return run("npm", args, { cwd, timeout: isLongRunning(args) ? 300_000 : 60_000 });
}

export async function pnpm(args: string[], cwd?: string): Promise<RunResult> {
  return run("pnpm", args, { cwd, timeout: isLongRunning(args) ? 300_000 : 60_000 });
}

/** Run a command with the appropriate package manager. */
export async function runPm(pm: PackageManager, args: string[], cwd?: string): Promise<RunResult> {
  return pm === "pnpm" ? pnpm(args, cwd) : npm(args, cwd);
}
