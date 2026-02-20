import { run, type RunResult } from "@paretools/shared";

export async function cmakeCmd(args: string[], cwd?: string): Promise<RunResult> {
  return run("cmake", args, { cwd, timeout: 300_000 });
}

export async function ctestCmd(args: string[], cwd?: string): Promise<RunResult> {
  return run("ctest", args, { cwd, timeout: 300_000 });
}
