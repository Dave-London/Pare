import { run, type RunResult } from "@paretools/shared";

/** Runs a `bun` command with the given arguments. */
export async function bunCmd(args: string[], cwd?: string): Promise<RunResult> {
  return run("bun", args, { cwd, timeout: 300_000 });
}
