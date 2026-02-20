import { run, type RunResult } from "@paretools/shared";

/** Runs a `terraform` command with the given arguments. */
export async function terraformCmd(args: string[], cwd?: string): Promise<RunResult> {
  return run("terraform", args, { cwd, timeout: 300_000 });
}
