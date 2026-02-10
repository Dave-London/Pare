import { run, type RunResult } from "@paretools/shared";

export async function pip(args: string[], cwd?: string): Promise<RunResult> {
  return run("pip", args, { cwd });
}

export async function mypy(args: string[], cwd?: string): Promise<RunResult> {
  return run("mypy", args, { cwd });
}

export async function ruff(args: string[], cwd?: string): Promise<RunResult> {
  return run("ruff", args, { cwd });
}
