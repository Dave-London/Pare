import { realpathSync } from "node:fs";
import { rm } from "node:fs/promises";
import { resolve } from "node:path";
import { git } from "./git-runner.js";
import { normalizeWorktreePath, parseWorktreeList, worktreePathsEqual } from "./parsers.js";

/**
 * Resolves a path through the filesystem before normalizing it. Callers hand us
 * whatever they typed — a short 8.3 alias like `C:\Users\RUNNER~1\...`, a `..`
 * segment, a symlinked parent — while git stores the fully resolved path, so
 * plain string comparison misses matches that are in fact the same directory.
 * Falls back to normalization when the path no longer exists.
 */
function canonicalWorktreePath(p: string): string {
  try {
    return normalizeWorktreePath(realpathSync.native(p));
  } catch {
    return normalizeWorktreePath(p);
  }
}

/** True when two paths name the same worktree directory. */
function samePath(a: string, b: string): boolean {
  return worktreePathsEqual(a, b) || canonicalWorktreePath(a) === canonicalWorktreePath(b);
}

/** Outcome of a worktree removal attempt. */
export interface WorktreeRemoveOutcome {
  /** True when the worktree is both unregistered and gone from disk. */
  removed: boolean;
  /** Git's stderr (plus any cleanup error) — only set when `removed` is false. */
  error?: string;
  /** True when the working directory had to be deleted by the tool after git bailed. */
  cleanedUp?: boolean;
}

/**
 * Whether `worktreePath` is still a registered worktree of the repo at `cwd`.
 * Returns undefined when the list itself failed, so callers can fail safe.
 */
async function isRegistered(cwd: string, worktreePath: string): Promise<boolean | undefined> {
  const list = await git(["worktree", "list", "--porcelain"], cwd);
  if (list.exitCode !== 0) return undefined;
  return parseWorktreeList(list.stdout).worktrees.some((w) => samePath(w.path, worktreePath));
}

/**
 * Removes a worktree, repairing git's half-done removal state (#1073).
 *
 * `git worktree remove` deletes the admin entry (`.git/worktrees/<id>`) even when
 * the recursive delete of the working directory fails first — on Windows a large
 * `node_modules` tree trips this routinely with `Filename too long`. The command
 * then exits non-zero while the worktree is already unregistered, leaving an
 * orphaned directory that later `remove` calls reject with "is not a working tree".
 *
 * So on failure we re-check registration:
 *   - still registered ⇒ a genuine failure; report `removed: false` with git's stderr
 *     and leave the worktree alone (no prune, no deletion).
 *   - no longer registered ⇒ only the directory delete failed; finish the job with a
 *     recursive delete and report `removed: true`.
 *
 * The recursive delete only ever runs for a path git had registered as a worktree
 * before the attempt, so a "not a working tree" error can never delete a directory.
 *
 * @param cwd - Repository directory the git command runs in
 * @param worktreePath - Path of the worktree to remove
 * @param opts.force - Pass `--force` to git
 * @param opts.wasRegistered - Skip the pre-flight list when the caller already knows
 */
export async function removeWorktree(
  cwd: string,
  worktreePath: string,
  opts: { force?: boolean; wasRegistered?: boolean } = {},
): Promise<WorktreeRemoveOutcome> {
  const wasRegistered = opts.wasRegistered ?? (await isRegistered(cwd, worktreePath));

  const args = ["worktree", "remove"];
  if (opts.force) args.push("--force");
  args.push(worktreePath);

  const result = await git(args, cwd);
  if (result.exitCode === 0) return { removed: true };

  const error =
    result.stderr.trim() ||
    result.stdout.trim() ||
    `git worktree remove exited with code ${result.exitCode}`;

  // Only a path git had registered may be deleted from disk by us.
  if (wasRegistered !== true) return { removed: false, error };

  const stillRegistered = await isRegistered(cwd, worktreePath);
  // Still registered (or unknown) ⇒ nothing was unregistered; report the failure as-is.
  if (stillRegistered !== false) return { removed: false, error };

  try {
    // resolve() first: a caller's trailing "/." or ".." segment makes the
    // recursive delete fail outright on Linux (EINVAL on "refusing to remove '.'").
    await rm(resolve(worktreePath), { recursive: true, force: true, maxRetries: 3 });
  } catch (e) {
    const detail = e instanceof Error ? e.message : String(e);
    return { removed: false, error: `${error}; directory cleanup failed: ${detail}` };
  }

  return { removed: true, cleanedUp: true };
}
