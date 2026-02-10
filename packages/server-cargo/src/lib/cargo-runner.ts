import { run, type RunResult } from "@paretools/shared";

export async function cargo(args: string[], cwd?: string): Promise<RunResult> {
  return run("cargo", args, { cwd });
}
