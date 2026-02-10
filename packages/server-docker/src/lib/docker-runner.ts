import { run, type RunResult } from "@paretools/shared";

export async function docker(args: string[], cwd?: string): Promise<RunResult> {
  // Docker build/pull/run/compose operations can take minutes; use 5-minute timeout
  const longOps = new Set(["build", "pull", "run", "compose"]);
  const isLong = longOps.has(args[0]);
  return run("docker", args, { cwd, timeout: isLong ? 300_000 : 30_000 });
}
