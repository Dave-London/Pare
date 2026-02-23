import { platform } from "node:os";

/** Whether we're running on Windows. */
export function isWindows(): boolean {
  return platform() === "win32";
}

/**
 * Build the command + args for spawning an npx-based server.
 * On Windows, wraps with `cmd /c` to avoid ENOENT issues.
 *
 * @param pkg - npm package name
 * @param forceWindows - override platform detection (for testing)
 */
export function npxCommand(
  pkg: string,
  forceWindows?: boolean,
): { command: string; args: string[] } {
  const win = forceWindows ?? isWindows();
  if (win) {
    return { command: "cmd", args: ["/c", "npx", "-y", pkg] };
  }
  return { command: "npx", args: ["-y", pkg] };
}
