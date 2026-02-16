import { realpathSync, lstatSync } from "node:fs";
import { resolve, isAbsolute, relative } from "node:path";

/**
 * Validates that a file path is safe to pass to `gh gist create`.
 * Rejects paths that:
 *  - Contain `..` path traversal components
 *  - Are absolute paths outside the working directory
 *  - Are symlinks pointing outside the working directory
 *
 * @param filePath  The user-supplied file path
 * @param cwd       The working directory used as the trust boundary
 * @throws Error if the path is unsafe
 */
export function assertSafeFilePath(filePath: string, cwd: string): void {
  // Reject path traversal via ".."
  if (filePath.includes("..")) {
    throw new Error(
      `Unsafe file path "${filePath}": path traversal ("..") is not allowed. ` +
        `Provide a relative path within the working directory.`,
    );
  }

  // Resolve the path relative to cwd
  const resolvedPath = resolve(cwd, filePath);

  // Reject absolute paths outside the cwd
  if (isAbsolute(filePath)) {
    const rel = relative(cwd, resolvedPath);
    if (rel.startsWith("..")) {
      throw new Error(
        `Unsafe file path "${filePath}": absolute path is outside the working directory "${cwd}". ` +
          `Provide a relative path within the working directory.`,
      );
    }
  }

  // Check for symlinks pointing outside cwd
  try {
    const stat = lstatSync(resolvedPath);
    if (stat.isSymbolicLink()) {
      const realTarget = realpathSync(resolvedPath);
      // Resolve the real cwd too, to handle macOS /var -> /private/var symlinks
      const realCwd = realpathSync(cwd);
      const rel = relative(realCwd, realTarget);
      if (rel.startsWith("..")) {
        throw new Error(
          `Unsafe file path "${filePath}": symlink resolves to "${realTarget}" ` +
            `which is outside the working directory "${cwd}".`,
        );
      }
    }
  } catch (err) {
    // If the file doesn't exist yet (ENOENT), we can't check symlinks
    // but path traversal and absolute path checks above still apply.
    // Re-throw our own errors, ignore ENOENT.
    if (err instanceof Error && err.message.startsWith("Unsafe file path")) {
      throw err;
    }
    // File doesn't exist — path-traversal / absolute checks above are sufficient
  }
}
