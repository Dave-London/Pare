import { run, type RunResult } from "@paretools/shared";

/** Runs a `dotnet` subcommand with the given arguments and working directory. */
export async function dotnet(args: string[], cwd?: string, timeout?: number): Promise<RunResult> {
  return run("dotnet", args, { cwd, timeout: timeout ?? 300_000 });
}
