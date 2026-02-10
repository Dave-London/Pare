import { run, type RunResult } from "@paretools/shared";

export async function tsc(args: string[], cwd?: string): Promise<RunResult> {
  return run("npx", ["tsc", ...args], { cwd, timeout: 120_000 });
}

export async function runBuildCommand(
  cmd: string,
  args: string[],
  cwd?: string,
): Promise<RunResult> {
  // Build commands can take minutes for large projects
  return run(cmd, args, { cwd, timeout: 300_000 });
}
