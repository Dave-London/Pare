import { run, type RunResult } from "@paretools/shared";

export async function cargo(args: string[], cwd?: string): Promise<RunResult> {
  // cargo build/test can take minutes for large projects
  return run("cargo", args, { cwd, timeout: 300_000 });
}
