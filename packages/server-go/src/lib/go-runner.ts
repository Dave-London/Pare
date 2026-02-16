import { run, type RunResult } from "@paretools/shared";

export async function goCmd(args: string[], cwd?: string, timeout?: number): Promise<RunResult> {
  // go build/test can take minutes for large projects
  return run("go", args, { cwd, timeout: timeout ?? 300_000 });
}

export async function gofmtCmd(args: string[], cwd?: string): Promise<RunResult> {
  return run("gofmt", args, { cwd, timeout: 180_000 });
}

export async function golangciLintCmd(args: string[], cwd?: string): Promise<RunResult> {
  return run("golangci-lint", args, { cwd, timeout: 300_000 });
}
