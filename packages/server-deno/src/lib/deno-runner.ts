import { run, type RunResult } from "@paretools/shared";

/** Runs a `deno` command with the given arguments. */
export async function denoCmd(args: string[], cwd?: string): Promise<RunResult> {
  return run("deno", args, { cwd, timeout: 300_000 });
}
