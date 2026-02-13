import { run, type RunOptions, type RunResult } from "@paretools/shared";

export async function git(
  args: string[],
  cwd?: string,
  opts?: Pick<RunOptions, "stdin">,
): Promise<RunResult> {
  return run("git", args, { cwd, ...opts });
}
