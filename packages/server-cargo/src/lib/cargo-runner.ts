import { run, type RunResult } from "@paretools/shared";

export async function cargo(args: string[], cwd?: string, timeout?: number): Promise<RunResult> {
  // cargo build/test can take minutes for large projects
  return run("cargo", args, { cwd, timeout: timeout ?? 300_000 });
}
