import { run, type RunResult } from "@paretools/shared";

export async function goCmd(args: string[], cwd?: string): Promise<RunResult> {
  // go build/test can take minutes for large projects
  return run("go", args, { cwd, timeout: 300_000 });
}

export async function gofmtCmd(args: string[], cwd?: string): Promise<RunResult> {
  return run("gofmt", args, { cwd, timeout: 120_000 });
}
