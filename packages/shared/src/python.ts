import { existsSync } from "node:fs";
import { join } from "node:path";
import { run, type RunOptions, type RunResult } from "./runner.js";

function isCommandNotFoundError(error: unknown): boolean {
  return error instanceof Error && error.message.includes("Command not found:");
}

function isModuleNotFound(result: RunResult, moduleName: string): boolean {
  if (result.exitCode === 0) return false;
  const escaped = moduleName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`No module named ['"]?${escaped}['"]?`).test(result.stderr);
}

function unique(values: string[]): string[] {
  return [...new Set(values)];
}

function toRunOptions(opts?: RunOptions & { pythonPath?: string }): RunOptions | undefined {
  if (!opts) return undefined;
  const runOpts: RunOptions = {};
  if (opts.cwd !== undefined) runOpts.cwd = opts.cwd;
  if (opts.timeout !== undefined) runOpts.timeout = opts.timeout;
  if (opts.env !== undefined) runOpts.env = opts.env;
  if (opts.stdin !== undefined) runOpts.stdin = opts.stdin;
  if (opts.shell !== undefined) runOpts.shell = opts.shell;
  if (opts.maxBuffer !== undefined) runOpts.maxBuffer = opts.maxBuffer;
  if (opts.replaceEnv !== undefined) runOpts.replaceEnv = opts.replaceEnv;
  return runOpts;
}

/** Returns Python interpreter candidates in preferred resolution order. */
export function pythonInterpreterCandidates(
  cwd: string = process.cwd(),
  opts?: { explicit?: string; platform?: NodeJS.Platform },
): string[] {
  if (opts?.explicit) return [opts.explicit];

  const platform = opts?.platform ?? process.platform;
  const venvs = [".venv", "venv", "env"];
  const candidates: string[] = [];

  for (const venv of venvs) {
    const dir = join(cwd, venv, platform === "win32" ? "Scripts" : "bin");
    for (const name of platform === "win32" ? ["python.exe", "python"] : ["python", "python3"]) {
      const candidate = join(dir, name);
      if (existsSync(candidate)) candidates.push(candidate);
    }
  }

  candidates.push("python", "python3");
  return unique(candidates);
}

/** Runs a Python module through the best available interpreter. */
export async function runPythonModule(
  moduleName: string,
  args: string[],
  opts?: RunOptions & { pythonPath?: string },
): Promise<RunResult> {
  let lastError: unknown;
  const runOpts = toRunOptions(opts);
  const pythonPath = opts?.pythonPath;
  for (const python of pythonInterpreterCandidates(runOpts?.cwd, { explicit: pythonPath })) {
    try {
      const result = await run(python, ["-m", moduleName, ...args], runOpts);
      if (isModuleNotFound(result, moduleName)) {
        throw new Error(
          `Command not found: "${moduleName}". Ensure it is installed in the selected Python environment.`,
        );
      }
      return result;
    } catch (error) {
      if (!isCommandNotFoundError(error)) throw error;
      lastError = error;
    }
  }
  throw lastError instanceof Error ? lastError : new Error(`Command not found: "python"`);
}

/** Runs a Python tool executable, falling back to `python -m <module>` if missing. */
export async function runPythonTool(
  command: string,
  moduleName: string,
  args: string[],
  opts?: RunOptions & { pythonPath?: string },
): Promise<RunResult> {
  if (opts?.pythonPath) {
    return runPythonModule(moduleName, args, opts);
  }
  const runOpts = toRunOptions(opts);

  try {
    return await run(command, args, runOpts);
  } catch (error) {
    if (!isCommandNotFoundError(error)) throw error;
    return runPythonModule(moduleName, args, opts);
  }
}
