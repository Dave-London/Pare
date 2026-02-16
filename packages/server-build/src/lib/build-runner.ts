import { run, type RunResult } from "@paretools/shared";

export async function tsc(args: string[], cwd?: string): Promise<RunResult> {
  return run("npx", ["tsc", ...args], { cwd, timeout: 120_000 });
}

export async function runBuildCommand(
  cmd: string,
  args: string[],
  cwd?: string,
  timeout?: number,
): Promise<RunResult> {
  // Build commands can take minutes for large projects
  return run(cmd, args, { cwd, timeout: timeout ?? 300_000 });
}

export async function esbuildCmd(args: string[], cwd?: string): Promise<RunResult> {
  return run("npx", ["esbuild", ...args], { cwd, timeout: 120_000 });
}

export async function viteCmd(args: string[], cwd?: string): Promise<RunResult> {
  return run("npx", ["vite", "build", ...args], { cwd, timeout: 300_000 });
}

export async function webpackCmd(args: string[], cwd?: string): Promise<RunResult> {
  return run("npx", ["webpack", ...args], { cwd, timeout: 300_000 });
}

export async function turboCmd(args: string[], cwd?: string): Promise<RunResult> {
  return run("npx", ["turbo", ...args], { cwd, timeout: 300_000 });
}

export async function nxCmd(args: string[], cwd?: string): Promise<RunResult> {
  return run("npx", ["nx", ...args], { cwd, timeout: 300_000 });
}
