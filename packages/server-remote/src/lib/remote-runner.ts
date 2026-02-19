import { run, type RunResult } from "@paretools/shared";

/** Runs an `ssh` command with the given arguments. */
export async function sshCmd(args: string[], cwd?: string): Promise<RunResult> {
  return run("ssh", args, { cwd, timeout: 300_000 });
}

/** Runs an `ssh-keyscan` command with the given arguments. */
export async function sshKeyscanCmd(args: string[], cwd?: string): Promise<RunResult> {
  return run("ssh-keyscan", args, { cwd, timeout: 60_000 });
}

/** Runs an `rsync` command with the given arguments. */
export async function rsyncCmd(args: string[], cwd?: string): Promise<RunResult> {
  return run("rsync", args, { cwd, timeout: 300_000 });
}
