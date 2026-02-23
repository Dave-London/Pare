import { run, type RunResult } from "@paretools/shared";

export async function swiftCmd(args: string[], cwd?: string, timeout?: number): Promise<RunResult> {
  // Swift build/test can take minutes for large projects
  return run("swift", args, { cwd, timeout: timeout ?? 300_000 });
}
