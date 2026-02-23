import { run, type RunResult } from "@paretools/shared";

/** Runs a `nix` command with the given arguments. */
export async function nixCmd(args: string[], cwd?: string): Promise<RunResult> {
  return run("nix", args, { cwd, timeout: 600_000 });
}
