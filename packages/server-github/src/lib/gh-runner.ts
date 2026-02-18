import { run, type RunResult } from "@paretools/shared";

export interface GhCmdOptions {
  cwd?: string;
  /** Data to write to the child process's stdin (e.g., for --body-file -). */
  stdin?: string;
}

export async function ghCmd(args: string[], cwdOrOpts?: string | GhCmdOptions): Promise<RunResult> {
  const opts = typeof cwdOrOpts === "string" ? { cwd: cwdOrOpts } : cwdOrOpts;
  // gh is a native executable; disable shell mode to avoid cmd.exe escaping/quoting issues.
  return run("gh", args, { cwd: opts?.cwd, timeout: 30_000, stdin: opts?.stdin, shell: false });
}
