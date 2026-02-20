import { run, type RunResult } from "@paretools/shared";

export async function bazelCmd(args: string[], cwd?: string): Promise<RunResult> {
  return run("bazel", args, { cwd, timeout: 300_000 });
}
