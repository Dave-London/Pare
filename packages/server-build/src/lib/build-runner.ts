import { run, type RunResult } from "@paretools/shared";

export async function tsc(args: string[], cwd?: string): Promise<RunResult> {
  return run("npx", ["tsc", ...args], { cwd });
}

export async function runBuildCommand(
  cmd: string,
  args: string[],
  cwd?: string,
): Promise<RunResult> {
  return run(cmd, args, { cwd });
}
