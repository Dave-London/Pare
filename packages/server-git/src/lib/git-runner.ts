import { stat } from "node:fs/promises";
import { isAbsolute, join } from "node:path";
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
 * Pathspecs that must never be rewritten by casing resolution.
 *
 * `resolveFilePath` exists to canonicalise the *casing* of a single file path.
 * Anything that can legitimately match many files — ".", a directory, a glob, or
 * pathspec magic — must be handed to git untouched, otherwise it collapses to a
 * single tracked file (see #1057).
 */
function isMultiMatchPathspec(pathspec: string): boolean {
  if (pathspec === "" || pathspec === "." || pathspec === "./" || pathspec === "..") return true;
  // Trailing slash ⇒ explicitly a directory.
  if (pathspec.endsWith("/")) return true;
  // Glob / wildcard pathspecs.
  if (/[*?[\]]/.test(pathspec)) return true;
  // Pathspec magic, e.g. ":(icase)foo" or ":!excluded".
  if (pathspec.startsWith(":")) return true;
  return false;
}

/** True when the pathspec points at an existing directory on disk. */
async function isDirectoryPathspec(pathspec: string, cwd: string): Promise<boolean> {
  try {
    const stats = await stat(isAbsolute(pathspec) ? pathspec : join(cwd, pathspec));
    return stats.isDirectory();
  } catch {
    return false;
  }
}

/**
 * Picks the tracked path that is a case-variant of the requested path.
 *
 * `git ls-files -- <pathspec>` returns *every* file under a directory pathspec, so
 * blindly taking the first line rewrites "src" into "src/a.ts". Only accept a
 * result that differs from the input by casing alone.
 */
function pickCaseVariant(stdout: string, normalized: string): string | undefined {
  const target = normalized.toLowerCase();
  return stdout
    .trim()
    .split("\n")
    .map((line) => line.trim())
    .find((line) => line.length > 0 && line.toLowerCase() === target);
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
 * Directory, ".", and glob pathspecs are passed through unchanged so they keep
 * expanding the way git expands them (#1057).
 *
 * @param filePath - The user-provided file path
 * @param cwd - The repository working directory
 * @returns The canonical file path from git, or the normalized original if not tracked
 */
export async function resolveFilePath(filePath: string, cwd: string): Promise<string> {
  const normalized = normalizePath(filePath);

  // Multi-match pathspecs (".", dirs, globs) must reach git verbatim.
  if (isMultiMatchPathspec(normalized)) return normalized;
  if (await isDirectoryPathspec(normalized, cwd)) return normalized;

  // Exact match — git tracks the path with this casing already.
  const result = await git(["ls-files", "--", normalized], cwd);
  if (result.exitCode === 0) {
    const exact = pickCaseVariant(result.stdout, normalized);
    if (exact) return exact;
  }

  // No exact match — try case-insensitive lookup via ls-files with icase pathspec magic.
  const icaseResult = await git(["ls-files", "--", `:(icase)${normalized}`], cwd);
  if (icaseResult.exitCode === 0) {
    const icase = pickCaseVariant(icaseResult.stdout, normalized);
    if (icase) return icase;
  }

  // Not a tracked single file (untracked, deleted, or a directory that no longer
  // exists on disk) — return the normalized path and let git interpret it.
  return normalized;
}

/**
 * Resolves multiple file paths to their canonical casing.
 * @see resolveFilePath
 */
export async function resolveFilePaths(filePaths: string[], cwd: string): Promise<string[]> {
  return Promise.all(filePaths.map((fp) => resolveFilePath(fp, cwd)));
}
