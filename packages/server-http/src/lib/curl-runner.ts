import { run, type RunResult } from "@paretools/shared";

/**
 * Executes a curl command with the given arguments.
 * Uses a generous timeout since HTTP requests can be slow.
 */
export async function curlCmd(args: string[], cwd?: string): Promise<RunResult> {
  return run("curl", args, { cwd, timeout: 180_000 });
}
