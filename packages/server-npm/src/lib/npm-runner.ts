import { run, type RunResult } from "@paretools/shared";

export async function npm(args: string[], cwd?: string): Promise<RunResult> {
  // npm install can take minutes for large dependency trees
  const isInstall = args[0] === "install" || args[0] === "i" || args[0] === "ci";
  return run("npm", args, { cwd, timeout: isInstall ? 300_000 : 60_000 });
}
