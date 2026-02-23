import { platform } from "node:os";

/** Whether we're running on Windows. */
export function isWindows(): boolean {
  return platform() === "win32";
}

/**
 * Build the command + args for spawning an npx-based server.
 * On Windows, wraps with `cmd /c` to avoid ENOENT issues.
 */
export function npxCommand(pkg: string): { command: string; args: string[] } {
  if (isWindows()) {
    return { command: "cmd", args: ["/c", "npx", "-y", pkg] };
  }
  return { command: "npx", args: ["-y", pkg] };
}
