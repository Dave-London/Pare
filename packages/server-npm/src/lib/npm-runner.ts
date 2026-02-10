import { run, type RunResult } from "@paretools/shared";

export async function npm(args: string[], cwd?: string): Promise<RunResult> {
  // npm install, run, and test can take minutes for large operations
  const isLongRunning =
    args[0] === "install" ||
    args[0] === "i" ||
    args[0] === "ci" ||
    args[0] === "run" ||
    args[0] === "run-script" ||
    args[0] === "test" ||
    args[0] === "t";
  return run("npm", args, { cwd, timeout: isLongRunning ? 300_000 : 60_000 });
}
