import { run, type RunResult } from "@paretools/shared";

export async function eslint(args: string[], cwd?: string): Promise<RunResult> {
  return run("npx", ["eslint", ...args], { cwd, timeout: 120_000 });
}

export async function prettier(args: string[], cwd?: string): Promise<RunResult> {
  return run("npx", ["prettier", ...args], { cwd, timeout: 120_000 });
}

export async function biome(args: string[], cwd?: string): Promise<RunResult> {
  return run("npx", ["@biomejs/biome", ...args], { cwd, timeout: 120_000 });
}

export async function stylelintCmd(args: string[], cwd?: string): Promise<RunResult> {
  return run("npx", ["stylelint", ...args], { cwd, timeout: 120_000 });
}

export async function oxlintCmd(args: string[], cwd?: string): Promise<RunResult> {
  return run("npx", ["oxlint", ...args], { cwd, timeout: 120_000 });
}

export async function shellcheckCmd(args: string[], cwd?: string): Promise<RunResult> {
  return run("shellcheck", args, { cwd, timeout: 120_000 });
}

export async function hadolintCmd(args: string[], cwd?: string): Promise<RunResult> {
  return run("hadolint", args, { cwd, timeout: 120_000 });
}
