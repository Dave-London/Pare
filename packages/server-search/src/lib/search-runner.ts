import { statSync } from "node:fs";
import { dirname, basename, isAbsolute, resolve } from "node:path";
import { run, type RunResult } from "@paretools/shared";

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

/**
 * Resolves a user-supplied `path` parameter into a `cwd` and a positional
 * `target` argument suitable for ripgrep/fd.
 *
 * Behavior:
 * - If `path` is undefined/empty → cwd = process.cwd(), target = "."
 *   (search current dir, isFile = false).
 * - If `path` is an existing directory → cwd = path, target = "."
 *   (search recursively, isFile = false).
 * - If `path` is an existing file → cwd = parent dir, target = basename
 *   (search just that file, isFile = true). Spawning with cwd pointed at a
 *   file is what produces the `spawn ENOTDIR` crash, so we split it.
 * - If `path` does not exist → cwd = process.cwd(), target = path
 *   (isFile = false). Let ripgrep surface its own "no such file" error
 *   rather than crashing the spawn.
 *
 * The `isFile` flag lets callers add ripgrep flags like `--with-filename`
 * when needed (rg's `--count` omits the filename when given a single file
 * positional, which breaks the count parser).
 */
export function resolveSearchTarget(path?: string): {
  cwd: string;
  target: string;
  isFile: boolean;
} {
  if (!path) {
    return { cwd: process.cwd(), target: ".", isFile: false };
  }

  const absolute = isAbsolute(path) ? path : resolve(process.cwd(), path);

  try {
    const stat = statSync(absolute);
    if (stat.isDirectory()) {
      return { cwd: absolute, target: ".", isFile: false };
    }
    // It's a file (or symlink/special file) — split into parent + basename so
    // the child process spawn doesn't fail with ENOTDIR.
    return { cwd: dirname(absolute), target: basename(absolute), isFile: true };
  } catch {
    // Path doesn't exist (or isn't accessible). Fall back to passing the
    // raw path as a positional argument from the current working directory
    // so ripgrep itself emits the user-facing "no such file" message.
    return { cwd: process.cwd(), target: path, isFile: false };
  }
}

export async function fdCmd(args: string[], cwd?: string): Promise<RunResult> {
  return runWithInstallHint("fd", args, { cwd, timeout: 180_000 });
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
