import { run, type RunResult } from "@paretools/shared";

/** Runs a `ruby` command with the given arguments. */
export async function rubyCmd(args: string[], cwd?: string): Promise<RunResult> {
  return run("ruby", args, { cwd, timeout: 300_000 });
}

/** Runs a `gem` command with the given arguments. */
export async function gemCmd(args: string[], cwd?: string): Promise<RunResult> {
  return run("gem", args, { cwd, timeout: 300_000 });
}

/** Runs a `bundle` command with the given arguments. */
export async function bundleCmd(args: string[], cwd?: string): Promise<RunResult> {
  return run("bundle", args, { cwd, timeout: 300_000 });
}
