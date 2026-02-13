import { run, type RunOptions, type RunResult } from "@paretools/shared";

export async function git(
  args: string[],
  cwd?: string,
  opts?: Pick<RunOptions, "stdin">,
): Promise<RunResult> {
  // git is a native executable — disable shell mode to prevent cmd.exe from
  // misinterpreting <> in format strings (e.g., --format="%an <%ae>").
  return run("git", args, { cwd, shell: false, ...opts });
}
