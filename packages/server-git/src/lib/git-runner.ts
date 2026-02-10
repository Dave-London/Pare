import { run, type RunResult } from "@paretools/shared";

export async function git(args: string[], cwd?: string): Promise<RunResult> {
  return run("git", args, { cwd });
}
