import { existsSync } from "node:fs";
import { dirname, join, parse } from "node:path";
import { run, type RunResult } from "@paretools/shared";

/**
 * Walks up from `cwd` looking for `node_modules/.bin/<binary>` (or `<binary>.cmd`
 * on Windows). Returns the resolved path, or `undefined` if not found before
 * hitting the filesystem root.
 */
function findLocalBinary(cwd: string, binary: string): string | undefined {
  const isWin = process.platform === "win32";
  const candidates = isWin ? [`${binary}.cmd`, `${binary}.exe`, binary] : [binary];
  let current = cwd;
  const root = parse(current).root;
  while (true) {
    for (const name of candidates) {
      const candidate = join(current, "node_modules", ".bin", name);
      if (existsSync(candidate)) return candidate;
    }
    if (current === root) return undefined;
    const parent = dirname(current);
    if (parent === current) return undefined;
    current = parent;
  }
}

/**
 * Asserts that a binary is available at `<cwd>/node_modules/.bin/<binary>` (or
 * any ancestor — supports workspaces). Throws a typed error pointing at the
 * missing-deps case so consumers don't get a contradictory empty diagnostics
 * result. See #842.
 */
export function assertBinaryAvailable(cwd: string, binary: string): void {
  if (findLocalBinary(cwd, binary)) return;
  const expected = join(cwd, "node_modules", ".bin", binary);
  throw new Error(
    `${binary} binary not found at ${expected} — try running "pnpm install" (or "npm install" / "yarn install") in ${cwd}.`,
  );
}

export async function tsc(args: string[], cwd?: string): Promise<RunResult> {
  const workdir = cwd ?? process.cwd();
  assertBinaryAvailable(workdir, "tsc");
  return run("npx", ["tsc", ...args], { cwd, timeout: 180_000 });
}

export async function runBuildCommand(
  cmd: string,
  args: string[],
  cwd?: string,
  timeout?: number,
  env?: Record<string, string>,
): Promise<RunResult> {
  // Build commands can take minutes for large projects
  return run(cmd, args, { cwd, timeout: timeout ?? 300_000, env });
}

export async function esbuildCmd(args: string[], cwd?: string): Promise<RunResult> {
  return run("npx", ["esbuild", ...args], { cwd, timeout: 180_000 });
}

export async function viteCmd(args: string[], cwd?: string): Promise<RunResult> {
  return run("npx", ["vite", "build", ...args], { cwd, timeout: 300_000 });
}

export async function webpackCmd(
  args: string[],
  cwd?: string,
  env?: Record<string, string>,
): Promise<RunResult> {
  return run("npx", ["webpack", ...args], { cwd, timeout: 300_000, env });
}

export async function turboCmd(args: string[], cwd?: string): Promise<RunResult> {
  return run("npx", ["turbo", ...args], { cwd, timeout: 300_000 });
}

export async function nxCmd(args: string[], cwd?: string): Promise<RunResult> {
  return run("npx", ["nx", ...args], { cwd, timeout: 300_000 });
}

export async function lernaCmd(args: string[], cwd?: string): Promise<RunResult> {
  return run("npx", ["lerna", ...args], { cwd, timeout: 300_000 });
}

export async function rollupCmd(args: string[], cwd?: string): Promise<RunResult> {
  return run("npx", ["rollup", ...args], { cwd, timeout: 300_000 });
}
