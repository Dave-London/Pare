import { run, type RunResult } from "@paretools/shared";

export async function eslint(args: string[], cwd?: string): Promise<RunResult> {
  return run("npx", ["eslint", ...args], { cwd });
}

export async function prettier(args: string[], cwd?: string): Promise<RunResult> {
  return run("npx", ["prettier", ...args], { cwd });
}
