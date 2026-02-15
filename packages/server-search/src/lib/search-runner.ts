import { run, type RunResult } from "@paretools/shared";

/** Platform-specific install hints for commands used by the search package. */
const INSTALL_HINTS: Record<string, string> = {
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
  return runWithInstallHint("rg", args, { cwd, timeout: 120_000 });
}

export async function fdCmd(args: string[], cwd?: string): Promise<RunResult> {
  return runWithInstallHint("fd", args, { cwd, timeout: 120_000 });
}

export async function jqCmd(
  args: string[],
  opts?: { cwd?: string; stdin?: string },
): Promise<RunResult> {
  return runWithInstallHint("jq", args, { cwd: opts?.cwd, stdin: opts?.stdin, timeout: 120_000 });
}
