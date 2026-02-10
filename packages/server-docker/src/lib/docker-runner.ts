import { run, type RunResult } from "@paretools/shared";

export async function docker(args: string[], cwd?: string): Promise<RunResult> {
  // Docker build/pull operations can take minutes; use 5-minute timeout
  const isBuild = args[0] === "build" || args[0] === "pull";
  return run("docker", args, { cwd, timeout: isBuild ? 300_000 : 30_000 });
}
