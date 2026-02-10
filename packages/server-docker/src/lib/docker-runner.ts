import { run, type RunResult } from "@paretools/shared";

export async function docker(args: string[], cwd?: string): Promise<RunResult> {
  return run("docker", args, { cwd });
}
