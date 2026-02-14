import { run, type RunResult } from "@paretools/shared";

export async function pip(args: string[], cwd?: string): Promise<RunResult> {
  return run("pip", args, { cwd, timeout: 120_000 });
}

export async function mypy(args: string[], cwd?: string): Promise<RunResult> {
  return run("mypy", args, { cwd, timeout: 120_000 });
}

export async function ruff(args: string[], cwd?: string): Promise<RunResult> {
  return run("ruff", args, { cwd, timeout: 120_000 });
}

export async function pytest(args: string[], cwd?: string): Promise<RunResult> {
  return run("pytest", args, { cwd, timeout: 300_000 });
}

export async function uv(args: string[], cwd?: string): Promise<RunResult> {
  return run("uv", args, { cwd, timeout: 120_000 });
}

export async function black(args: string[], cwd?: string): Promise<RunResult> {
  return run("black", args, { cwd, timeout: 120_000 });
}

export async function conda(args: string[], cwd?: string): Promise<RunResult> {
  return run("conda", args, { cwd, timeout: 120_000 });
}
