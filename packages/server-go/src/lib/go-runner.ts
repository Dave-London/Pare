import { run, type RunResult } from "@paretools/shared";

export async function goCmd(args: string[], cwd?: string): Promise<RunResult> {
  return run("go", args, { cwd });
}
