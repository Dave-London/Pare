import { run, type RunResult } from "@paretools/shared";

export async function ghCmd(args: string[], cwd?: string): Promise<RunResult> {
  return run("gh", args, { cwd, timeout: 30_000 });
}
