import { run, type RunResult } from "@paretools/shared";
import { statSync } from "node:fs";
import { dirname, isAbsolute, resolve as resolvePath } from "node:path";

/** Platform-specific install hints for commands used by the search package. */
const INSTALL_HINTS: Record<string, string> = {
  yq: [
    `Command not found: "yq". Install it to use this tool:`,
    `  macOS:   brew install yq`,
    `  Ubuntu:  sudo snap install yq`,
    `  Windows: choco install yq`,
    `  More:    https://github.com/mikefarah/yq#install`,
  ].join("\n"),
  rg: [
    `Command not found: "rg". Install it to use this tool:`,
    `  macOS:   brew install ripgrep`,
    `  Ubuntu:  sudo apt install ripgrep`,
    `  Windows: choco install ripgrep`,
    `  More:    https://github.com/BurntSushi/ripgrep#installation`,
  ].join("\n"),
  fd: [
    `Command not found: "fd". Install it to use this tool:`,
    `  macOS:   brew install fd`,
    `  Ubuntu:  sudo apt install fd-find`,
    `  Windows: choco install fd`,
    `  More:    https://github.com/sharkdp/fd#installation`,
  ].join("\n"),
  jq: [
    `Command not found: "jq". Install it to use this tool:`,
    `  macOS:   brew install jq`,
    `  Ubuntu:  sudo apt install jq`,
    `  Windows: choco install jq`,
    `  More:    https://github.com/jqlang/jq#installation`,
  ].join("\n"),
};

/**
 * Wraps a run() call to enhance "Command not found" errors with
 * platform-specific install hints for the search package's CLI dependencies.
 */
async function runWithInstallHint(
  cmd: string,
  args: string[],
  opts?: Parameters<typeof run>[2],
): Promise<RunResult> {
  try {
    return await run(cmd, args, opts);
  } catch (error: unknown) {
    if (error instanceof Error && error.message.includes("Command not found")) {
      const hint = INSTALL_HINTS[cmd];
      if (hint) {
        throw new Error(hint);
      }
    }
    throw error;
  }
}

export async function rgCmd(args: string[], cwd?: string): Promise<RunResult> {
  return runWithInstallHint("rg", args, { cwd, timeout: 180_000 });
}

export async function fdCmd(args: string[], cwd?: string): Promise<RunResult> {
  return runWithInstallHint("fd", args, { cwd, timeout: 180_000 });
}

/**
 * Result of resolving a user-supplied `path` parameter into a `cwd` for the
 * underlying CLI plus a positional target path to pass to it.
 *
 * - For directory inputs, `cwd` is the directory itself and `target` is "."
 *   (preserves current behaviour).
 * - For file inputs, `cwd` is the file's parent directory and `target` is the
 *   absolute file path so the CLI searches just that file rather than crashing
 *   with `spawn ENOTDIR` when the file path is used as a process cwd.
 */
export interface ResolvedSearchPath {
  cwd: string;
  target: string;
  isFile: boolean;
}

/**
 * Resolves a user-supplied search path into a safe (cwd, target) pair.
 *
 * Throws a typed Error with a clear message when the path does not exist or
 * is neither a regular file nor a directory.
 */
export function resolveSearchPath(inputPath: string | undefined): ResolvedSearchPath {
  if (!inputPath) {
    return { cwd: process.cwd(), target: ".", isFile: false };
  }

  const absolute = isAbsolute(inputPath) ? inputPath : resolvePath(process.cwd(), inputPath);

  let stat;
  try {
    stat = statSync(absolute);
  } catch (err: unknown) {
    const code = (err as NodeJS.ErrnoException).code;
    if (code === "ENOENT") {
      throw new Error(`path does not exist: ${inputPath}`);
    }
    if (code === "EACCES") {
      throw new Error(`path is not accessible: ${inputPath}`);
    }
    throw err;
  }

  if (stat.isDirectory()) {
    return { cwd: absolute, target: ".", isFile: false };
  }

  if (stat.isFile()) {
    return { cwd: dirname(absolute), target: absolute, isFile: true };
  }

  throw new Error(`path is not a regular file or directory: ${inputPath}`);
}

export async function yqCmd(
  args: string[],
  opts?: { cwd?: string; stdin?: string },
): Promise<RunResult> {
  return runWithInstallHint("yq", args, { cwd: opts?.cwd, stdin: opts?.stdin, timeout: 180_000 });
}

export async function jqCmd(
  args: string[],
  opts?: { cwd?: string; stdin?: string },
): Promise<RunResult> {
  return runWithInstallHint("jq", args, { cwd: opts?.cwd, stdin: opts?.stdin, timeout: 180_000 });
}
