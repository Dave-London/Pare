import { run, type RunResult } from "@paretools/shared";

const DEFAULT_TIMEOUT = 30_000;

/** Runs a `psql` command with the given arguments. */
export async function psqlCmd(args: string[], cwd?: string): Promise<RunResult> {
  return run("psql", args, { cwd, timeout: DEFAULT_TIMEOUT });
}

/** Runs a `mysql` command with the given arguments. */
export async function mysqlCmd(args: string[], cwd?: string): Promise<RunResult> {
  return run("mysql", args, { cwd, timeout: DEFAULT_TIMEOUT });
}

/** Runs a `redis-cli` command with the given arguments. */
export async function redisCmd(args: string[], cwd?: string): Promise<RunResult> {
  return run("redis-cli", args, { cwd, timeout: DEFAULT_TIMEOUT });
}

/** Runs a `mongosh` command with the given arguments. */
export async function mongoshCmd(args: string[], cwd?: string): Promise<RunResult> {
  return run("mongosh", args, { cwd, timeout: DEFAULT_TIMEOUT });
}
