import { run, type RunResult } from "@paretools/shared";

/**
 * Go build flags that can execute arbitrary commands and must be blocked in buildArgs.
 */
const DANGEROUS_GO_FLAGS = ["-exec", "-toolexec"];

/**
 * Asserts that a list of Go build arguments does not contain flags
 * that allow arbitrary command execution.
 */
export function assertNoDangerousGoFlags(args: string[]): void {
  for (const arg of args) {
    const lower = arg.toLowerCase();
    for (const flag of DANGEROUS_GO_FLAGS) {
      if (lower === flag || lower.startsWith(flag + "=")) {
        throw new Error(
          `Flag "${arg}" is blocked in buildArgs because it can execute arbitrary commands.`,
        );
      }
    }
  }
}

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
