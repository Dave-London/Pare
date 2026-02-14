import { run, type RunResult } from "@paretools/shared";

export async function rgCmd(args: string[], cwd?: string): Promise<RunResult> {
  return run("rg", args, { cwd, timeout: 120_000 });
}

export async function fdCmd(args: string[], cwd?: string): Promise<RunResult> {
  return run("fd", args, { cwd, timeout: 120_000 });
}

export async function jqCmd(
  args: string[],
  opts?: { cwd?: string; stdin?: string },
): Promise<RunResult> {
  return run("jq", args, { cwd: opts?.cwd, stdin: opts?.stdin, timeout: 120_000 });
}
