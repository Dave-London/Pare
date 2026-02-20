import { run, type RunResult } from "@paretools/shared";

/** Runs a `vagrant` command with the given arguments. */
export async function vagrantCmd(args: string[], cwd?: string): Promise<RunResult> {
  return run("vagrant", args, { cwd, timeout: 300_000 });
}
