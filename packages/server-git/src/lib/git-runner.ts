import { run, type RunOptions, type RunResult } from "@paretools/shared";

export async function git(
  args: string[],
  cwd?: string,
  opts?: Pick<RunOptions, "stdin">,
): Promise<RunResult> {
  // git is a native executable — disable shell mode to prevent cmd.exe from
  // misinterpreting <> in format strings (e.g., --format="%an <%ae>").
  return run("git", args, { cwd, shell: false, ...opts });
}

/**
 * Normalizes a file path for cross-platform git usage:
 * - Converts backslashes to forward slashes (git always uses forward slashes)
 */
export function normalizePath(filePath: string): string {
  return filePath.replace(/\\/g, "/");
}

/**
 * Resolves a file path to its canonical casing as tracked by git.
 *
 * On Windows (case-insensitive filesystem), git pathspecs are still case-sensitive.
 * If the user provides "roadmap.md" but git tracks "ROADMAP.md", the command will
 * silently return empty results. This function uses `git ls-files` to find the
 * canonical path, enabling case-insensitive matching on Windows.
 *
 * On case-sensitive filesystems (Linux/macOS), this still works correctly —
 * it will only match if the casing is exact, which is the expected behavior.
 *
 * @param filePath - The user-provided file path
 * @param cwd - The repository working directory
 * @returns The canonical file path from git, or the normalized original if not tracked
 */
export async function resolveFilePath(filePath: string, cwd: string): Promise<string> {
  const normalized = normalizePath(filePath);

  // Use git ls-files with case-insensitive matching (-i) and glob pattern (--exclude)
  // to find the canonical path. We use -i flag only on case-insensitive filesystems.
  const result = await git(["ls-files", "--", normalized], cwd);

  if (result.exitCode === 0 && result.stdout.trim()) {
    // Exact match found — return the canonical path from git
    return result.stdout.trim().split("\n")[0];
  }

  // No exact match — try case-insensitive lookup via ls-files with icase pathspec magic
  const icaseResult = await git(["ls-files", "--", `:(icase)${normalized}`], cwd);

  if (icaseResult.exitCode === 0 && icaseResult.stdout.trim()) {
    const matches = icaseResult.stdout.trim().split("\n");
    // Return the first match (there should typically be only one on case-insensitive FS)
    return matches[0];
  }

  // File not tracked by git — return normalized path as-is
  return normalized;
}

/**
 * Resolves multiple file paths to their canonical casing.
 * @see resolveFilePath
 */
export async function resolveFilePaths(filePaths: string[], cwd: string): Promise<string[]> {
  return Promise.all(filePaths.map((fp) => resolveFilePath(fp, cwd)));
}
