import type {
  GitStatus,
  GitLog,
  GitDiff,
  GitBranchFull,
  GitShow,
  GitAdd,
  GitCommit,
  GitPull,
  GitPush,
  GitCheckout,
  GitTagFull,
  GitStashListFull,
  GitStash,
  GitRemoteFull,
  GitBlameFull,
  GitRestore,
  GitReset,
  GitCherryPick,
  GitMerge,
  GitRebase,
  GitLogGraphFull,
  GitReflogFull,
  GitBisect,
  GitWorktreeListFull,
  GitWorktree,
  ReflogAction,
  GitSubmoduleEntry,
  GitClean,
  GitConfigEntry,
} from "../schemas/index.js";

const STATUS_MAP: Record<string, GitStatus["staged"][number]["status"]> = {
  A: "added",
  M: "modified",
  D: "deleted",
  R: "renamed",
  C: "copied",
};

/** Parses `git status --porcelain=v1` output into structured status data with branch, staged, modified, and untracked files. */
export function parseStatus(stdout: string, branchLine: string): GitStatus {
  const lines = stdout.split("\n").filter(Boolean);
  const staged: GitStatus["staged"] = [];
  const modified: string[] = [];
  const deleted: string[] = [];
  const untracked: string[] = [];
  const conflicts: string[] = [];

  for (const line of lines) {
    const index = line[0];
    const worktree = line[1];
    const file = line.slice(3).trim();

    // Conflicts (both modified, unmerged, etc.)
    if (index === "U" || worktree === "U" || (index === "A" && worktree === "A")) {
      conflicts.push(file);
      continue;
    }

    // Staged changes
    if (index && index !== " " && index !== "?") {
      const parts = file.split(" -> ");
      staged.push({
        file: parts[parts.length - 1],
        status: STATUS_MAP[index] ?? "modified",
        ...(parts.length > 1 ? { oldFile: parts[0] } : {}),
      });
    }

    // Worktree changes
    if (worktree === "M") modified.push(file);
    else if (worktree === "D") deleted.push(file);
    else if (index === "?") untracked.push(file);
  }

  // Parse branch info from `git status --branch --porcelain=v1`
  const branch = parseBranchFromPorcelain(branchLine);

  return {
    branch: branch.name,
    upstream: branch.upstream,
    ahead: branch.ahead,
    behind: branch.behind,
    staged,
    modified,
    deleted,
    untracked,
    conflicts,
    clean:
      staged.length === 0 &&
      modified.length === 0 &&
      deleted.length === 0 &&
      untracked.length === 0 &&
      conflicts.length === 0,
  };
}

/** Parses `git status --porcelain=v2 --branch` output into structured status data. */
export function parseStatusV2(stdout: string): GitStatus {
  const lines = stdout.split("\n").filter(Boolean);
  const staged: GitStatus["staged"] = [];
  const modified: string[] = [];
  const deleted: string[] = [];
  const untracked: string[] = [];
  const conflicts: string[] = [];

  let branch = "unknown";
  let upstream: string | undefined;
  let ahead: number | undefined;
  let behind: number | undefined;

  for (const line of lines) {
    if (line.startsWith("# ")) {
      const meta = line.slice(2);
      if (meta.startsWith("branch.head ")) {
        branch = meta.slice("branch.head ".length).trim();
      } else if (meta.startsWith("branch.upstream ")) {
        upstream = meta.slice("branch.upstream ".length).trim();
      } else if (meta.startsWith("branch.ab ")) {
        const ab = meta.slice("branch.ab ".length).trim();
        const m = ab.match(/^\+(\d+)\s+-(\d+)$/);
        if (m) {
          ahead = parseInt(m[1], 10);
          behind = parseInt(m[2], 10);
        }
      }
      continue;
    }

    if (line.startsWith("? ")) {
      untracked.push(line.slice(2).trim());
      continue;
    }

    if (line.startsWith("u ")) {
      const parts = line.split(" ");
      const file = parts.slice(10).join(" ").trim();
      conflicts.push(file);
      continue;
    }

    if (line.startsWith("1 ") || line.startsWith("2 ")) {
      const renamed = line.startsWith("2 ");
      const splitByTab = line.split("\t");
      const meta = splitByTab[0];
      const xy = meta.split(" ")[1] ?? "  ";
      const index = xy[0] ?? " ";
      const worktree = xy[1] ?? " ";
      const file = renamed
        ? (splitByTab[2] ?? splitByTab[1] ?? "").trim()
        : (splitByTab[1] ?? "").trim();
      const oldFile = renamed ? (splitByTab[1] ?? "").trim() : undefined;

      if (index === "U" || worktree === "U" || (index === "A" && worktree === "A")) {
        conflicts.push(file);
        continue;
      }

      if (index && index !== " " && index !== "?") {
        staged.push({
          file,
          status: STATUS_MAP[index] ?? (renamed ? "renamed" : "modified"),
          ...(oldFile ? { oldFile } : {}),
        });
      }

      if (worktree === "M") modified.push(file);
      else if (worktree === "D") deleted.push(file);
    }
  }

  return {
    branch,
    porcelainVersion: "v2",
    upstream,
    ahead,
    behind,
    staged,
    modified,
    deleted,
    untracked,
    conflicts,
    clean:
      staged.length === 0 &&
      modified.length === 0 &&
      deleted.length === 0 &&
      untracked.length === 0 &&
      conflicts.length === 0,
  };
}

function parseBranchFromPorcelain(line: string): {
  name: string;
  upstream?: string;
  ahead?: number;
  behind?: number;
} {
  // "## main...origin/main [ahead 2, behind 1]"
  // "## main"
  // "## HEAD (no branch)"
  const stripped = line.replace(/^## /, "");
  const dotIndex = stripped.indexOf("...");

  if (dotIndex === -1) {
    return { name: stripped.split(" ")[0] };
  }

  const name = stripped.slice(0, dotIndex);
  const rest = stripped.slice(dotIndex + 3);
  const upstream = rest.split(" ")[0];

  const aheadMatch = rest.match(/ahead (\d+)/);
  const behindMatch = rest.match(/behind (\d+)/);

  return {
    name,
    upstream,
    ahead: aheadMatch ? parseInt(aheadMatch[1], 10) : undefined,
    behind: behindMatch ? parseInt(behindMatch[1], 10) : undefined,
  };
}

/** Parses custom-formatted `git log` output (NUL-delimited with SOH record separator) into structured commit entries. */
export function parseLog(stdout: string): GitLog {
  // New format: fields delimited by NUL (\x00), records terminated by SOH (\x01).
  // Format: hash\x00hashShort\x00author\x00date\x00refs\x00subject\x00body\x01
  // Legacy format (@@-delimited per line) is also supported for backward compatibility.
  const NUL = "\x00";
  const SOH = "\x01";
  const trimmed = stdout.trim();

  // Detect which format is in use
  const usesNul = trimmed.includes(NUL);

  if (usesNul) {
    // Split on record separator (SOH), then parse each record
    const records = trimmed.split(SOH).filter((r) => r.trim().length > 0);
    const commits = records.map((record) => {
      // Remove leading newline that git adds between records
      const rec = record.replace(/^\n+/, "");
      const [hash, hashShort, author, date, refs, subject, ...bodyParts] = rec.split(NUL);
      const body = bodyParts.join(NUL).trim();
      return {
        hash,
        hashShort,
        author,
        date,
        message: subject,
        ...(body ? { fullMessage: `${subject}\n\n${body}` } : {}),
        ...(refs ? { refs } : {}),
      };
    });
    return { commits };
  }

  // Legacy @@-delimited format (one commit per line)
  const DELIMITER = "@@";
  const lines = trimmed.split("\n").filter(Boolean);
  const commits = lines.map((line) => {
    const [hash, hashShort, author, date, refs, ...messageParts] = line.split(DELIMITER);
    return {
      hash,
      hashShort,
      author,
      date,
      message: messageParts.join(DELIMITER),
      ...(refs ? { refs } : {}),
    };
  });

  return { commits };
}

/** Parses `git diff --numstat` output into structured file-level diff statistics. */
export function parseDiffStat(stdout: string): GitDiff {
  // Parse --numstat output: additions\tdeletions\tfilename
  const lines = stdout.trim().split("\n").filter(Boolean);
  const files = lines.map((line) => {
    const [add, del, ...fileParts] = line.split("\t");
    const filePath = fileParts.join("\t");
    // Detect renames: "old => new" or "{old => new}/path"
    const renameMatch =
      filePath.match(/(.+)\{(.+) => (.+)\}(.*)/) || filePath.match(/(.+) => (.+)/);
    const isRename = !!renameMatch;
    // Binary files show "-" for both additions and deletions in --numstat
    const isBinary = add === "-" && del === "-";
    const additions = add === "-" ? 0 : parseInt(add, 10);
    const deletions = del === "-" ? 0 : parseInt(del, 10);

    return {
      file: filePath,
      status: (additions > 0 && deletions === 0 && !isRename
        ? "added"
        : isRename
          ? "renamed"
          : deletions > 0 && additions === 0
            ? "deleted"
            : "modified") as GitDiff["files"][number]["status"],
      additions,
      deletions,
      ...(isBinary ? { binary: true } : {}),
      ...(isRename && renameMatch ? { oldFile: renameMatch[1] ?? renameMatch[0] } : {}),
    };
  });

  return { files };
}

/** Parses `git branch -vv` or `git branch` output into a structured list of branches with the current branch marked and upstream tracking info. */
export function parseBranch(stdout: string): GitBranchFull {
  const lines = stdout.trim().split("\n").filter(Boolean);
  let current = "";
  const branches = lines.map((line) => {
    const isCurrent = line.startsWith("* ");
    // Git uses '*' for the current branch and '+' for branches checked out
    // in linked worktrees. Strip both markers before parsing the name.
    const stripped = line.replace(/^[*+]?\s+/, "");
    const name = stripped.split(/\s+/)[0];
    if (isCurrent) current = name;

    const lastCommitMatch = stripped.match(/^[^\s]+\s+([a-f0-9]{7,40})\s+/);
    const lastCommit = lastCommitMatch?.[1];

    // Parse upstream from -vv output: "branch hash [upstream/branch] message"
    // or "branch hash [upstream/branch: ahead N, behind M] message"
    const upstreamMatch = stripped.match(/\s+[a-f0-9]+\s+\[([^\]:]+?)(?:[:\]])/);
    const upstream = upstreamMatch ? upstreamMatch[1] : undefined;

    return {
      name,
      current: isCurrent,
      ...(upstream ? { upstream } : {}),
      ...(lastCommit ? { lastCommit } : {}),
    };
  });

  return { branches, current };
}

/** Parses custom-formatted `git show` output (NUL-delimited) and `--numstat` diff into structured commit details. */
export function parseShow(stdout: string, diffStdout: string): GitShow {
  // stdout is the formatted commit info, diffStdout is the numstat
  // Detect NUL-delimited format vs legacy @@-delimited format
  const usesNul = stdout.includes("\x00");

  let hash: string;
  let author: string;
  let date: string;
  let message: string;

  if (usesNul) {
    const parts = stdout.trim().split("\x00");
    hash = parts[0];
    author = parts[1];
    date = parts[2];
    message = parts.slice(3).join("\x00");
  } else {
    // Legacy @@ delimiter
    const DELIMITER = "@@";
    const parts = stdout.trim().split(DELIMITER);
    [hash, author, date] = parts;
    message = parts.slice(3).join(DELIMITER);
  }

  const diff = parseDiffStat(diffStdout);

  return {
    hash,
    hashShort: hash.slice(0, 7),
    author,
    date,
    message,
    diff,
  };
}

const ADD_STATUS_MAP: Record<string, "added" | "modified" | "deleted"> = {
  A: "added",
  M: "modified",
  D: "deleted",
};

/** Parses `git status --porcelain=v1` output after `git add` to extract the list of staged files with per-file status. */
export function parseAdd(statusStdout: string): GitAdd {
  const lines = statusStdout.split("\n").filter(Boolean);
  const files: Array<{ file: string; status: "added" | "modified" | "deleted" }> = [];

  for (const line of lines) {
    const index = line[0];
    // Staged files have a non-space, non-? character in the index position
    if (index && index !== " " && index !== "?") {
      const file = line.slice(3).trim();
      // Handle renames: "old -> new"
      const parts = file.split(" -> ");
      const status = ADD_STATUS_MAP[index] ?? "modified";
      files.push({ file: parts[parts.length - 1], status });
    }
  }

  return { files };
}

/** Parses `git commit` output into structured commit data with hash, message, and change statistics. */
export function parseCommit(stdout: string): GitCommit {
  // Example output:
  // "[main abc1234] Fix the bug\n 1 file changed, 2 insertions(+), 1 deletion(-)"
  // "[main (root-commit) abc1234] Initial commit\n 1 file changed, 1 insertion(+)"
  // "[feature/@scope/name abc1234] Some commit\n 1 file changed, 1 insertion(+)"
  // "[fix+hotfix abc1234] Some commit\n 1 file changed, 1 insertion(+)"
  // The branch name can contain @, +, /, -, ., and other special characters.
  // Use a more robust regex that matches the hash after any branch-like prefix:
  const headerMatch = stdout.match(/\[.+?\s+(?:\(root-commit\)\s+)?([a-f0-9]+)\]\s+(.+)/);

  const hash = headerMatch?.[1] ?? "";
  const message = headerMatch?.[2] ?? "";

  const filesMatch = stdout.match(/(\d+)\s+files?\s+changed/);
  const insertionsMatch = stdout.match(/(\d+)\s+insertions?\(\+\)/);
  const deletionsMatch = stdout.match(/(\d+)\s+deletions?\(-\)/);

  return {
    hash,
    hashShort: hash.slice(0, 7),
    message,
    filesChanged: filesMatch ? parseInt(filesMatch[1], 10) : 0,
    insertions: insertionsMatch ? parseInt(insertionsMatch[1], 10) : 0,
    deletions: deletionsMatch ? parseInt(deletionsMatch[1], 10) : 0,
  };
}

/** Classifies a push failure error type from the combined output. */
function classifyPushError(combined: string): Pick<GitPush, "errorType" | "rejectedRef" | "hint"> {
  // Non-fast-forward / rejected
  if (/\[rejected\]/.test(combined) || /non-fast-forward/.test(combined)) {
    const refMatch = combined.match(/!\s+\[rejected\]\s+(\S+)/);
    const hintMatch = combined.match(/hint:\s*(.+)/);
    return {
      errorType: "rejected",
      ...(refMatch ? { rejectedRef: refMatch[1] } : {}),
      ...(hintMatch ? { hint: hintMatch[1].trim() } : {}),
    };
  }

  // No upstream configured
  if (
    /no upstream branch/i.test(combined) ||
    /--set-upstream/i.test(combined) ||
    /has no upstream/i.test(combined)
  ) {
    return { errorType: "no-upstream" };
  }

  // Permission denied
  if (/permission.*denied/i.test(combined) || /could not read.*credentials/i.test(combined)) {
    return { errorType: "permission-denied" };
  }

  // Repository not found
  if (
    /repository not found/i.test(combined) ||
    /does not appear to be a git repository/i.test(combined)
  ) {
    return { errorType: "repository-not-found" };
  }

  // pre-receive hook declined
  if (/hook declined/i.test(combined) || /pre-receive hook/i.test(combined)) {
    return { errorType: "hook-declined" };
  }

  return { errorType: "unknown" };
}

function parsePushObjectStats(combined: string): GitPush["objectStats"] | undefined {
  const totalMatch = combined.match(
    /Total\s+(\d+)\s+\(delta\s+(\d+)\),\s+reused\s+(\d+)\s+\(delta\s+\d+\),\s+pack-reused\s+(\d+)/i,
  );
  const bytesMatch = combined.match(/Writing objects:\s+\d+%\s+\(\d+\/\d+\),\s+(\d+)\s+bytes/i);
  if (!totalMatch && !bytesMatch) return undefined;

  return {
    ...(totalMatch ? { total: parseInt(totalMatch[1], 10) } : {}),
    ...(totalMatch ? { delta: parseInt(totalMatch[2], 10) } : {}),
    ...(totalMatch ? { reused: parseInt(totalMatch[3], 10) } : {}),
    ...(totalMatch ? { packReused: parseInt(totalMatch[4], 10) } : {}),
    ...(bytesMatch ? { bytes: parseInt(bytesMatch[1], 10) } : {}),
  };
}

/** Parses `git push` output into structured push result data. */
export function parsePush(
  stdout: string,
  stderr: string,
  _remote: string,
  _branch: string,
): GitPush {
  // Git push output goes to stderr typically
  const combined = `${stdout}\n${stderr}`.trim();

  // Detect if the remote branch was newly created
  const created = /\[new branch\]|\[new tag\]/.test(combined);
  const objectStats = parsePushObjectStats(combined);

  return {
    success: true,
    summary: combined || "Push completed successfully",
    ...(created ? { created } : {}),
    ...(objectStats ? { objectStats } : {}),
  };
}

/** Parses a failed `git push` into structured push error data. */
export function parsePushError(
  stdout: string,
  stderr: string,
  _remote: string,
  _branch: string,
): GitPush {
  const combined = `${stdout}\n${stderr}`.trim();
  const errorInfo = classifyPushError(combined);
  const objectStats = parsePushObjectStats(combined);

  return {
    success: false,
    summary: combined || "Push failed",
    ...errorInfo,
    ...(objectStats ? { objectStats } : {}),
  };
}

/** Parses pull diffstat lines like " src/index.ts | 10 +++++++---" into changed file entries. */
function parsePullChangedFiles(
  combined: string,
): Array<{ file: string; insertions?: number; deletions?: number }> {
  const changedFiles: Array<{ file: string; insertions?: number; deletions?: number }> = [];

  // Match lines like " src/index.ts | 10 +++++++---"
  // or " src/index.ts | Bin 0 -> 1234 bytes"
  // Use \s* instead of \s+ to handle cases where leading spaces may have been trimmed
  const fileStatPattern = /^\s*(\S.*?)\s+\|\s+(\d+)\s*([+-]*)/gm;
  let match;
  while ((match = fileStatPattern.exec(combined)) !== null) {
    const file = match[1].trim();
    const totalChanges = parseInt(match[2], 10);
    const changeChars = match[3] || "";
    const plusCount = (changeChars.match(/\+/g) || []).length;
    const minusCount = (changeChars.match(/-/g) || []).length;

    // If we have +/- markers, use their ratio to split total changes
    if (plusCount + minusCount > 0) {
      const ratio = totalChanges / (plusCount + minusCount);
      changedFiles.push({
        file,
        insertions: Math.round(plusCount * ratio),
        deletions: Math.round(minusCount * ratio),
      });
    } else {
      changedFiles.push({ file });
    }
  }

  return changedFiles;
}

/** Parses `git pull` output into structured pull result data with change stats and conflict detection. */
export function parsePull(stdout: string, stderr: string): GitPull {
  const combined = `${stdout}\n${stderr}`.trim();

  // Check for conflicts
  const conflicts: string[] = [];
  const conflictPattern = /CONFLICT \(.*?\): (?:Merge conflict in )?(.+)/g;
  let match;
  while ((match = conflictPattern.exec(combined)) !== null) {
    conflicts.push(match[1]);
  }

  // Parse change stats: "3 files changed, 10 insertions(+), 2 deletions(-)"
  const filesMatch = combined.match(/(\d+)\s+files?\s+changed/);
  const insertionsMatch = combined.match(/(\d+)\s+insertions?\(\+\)/);
  const deletionsMatch = combined.match(/(\d+)\s+deletions?\(-\)/);

  // Check for "Already up to date."
  const alreadyUpToDate = /Already up to date/i.test(combined);

  // Detect fast-forward
  const fastForward = /Fast-forward|fast-forward/i.test(combined);

  // Parse changed files from diffstat
  const changedFiles = parsePullChangedFiles(combined);

  // Build conflictFiles array (distinct from conflicts which has context)
  const conflictFiles = conflicts.length > 0 ? [...conflicts] : undefined;

  let summary: string;
  if (conflicts.length > 0) {
    summary = `Pull completed with ${conflicts.length} conflict(s)`;
  } else if (alreadyUpToDate) {
    summary = "Already up to date";
  } else {
    summary = combined.split("\n")[0] || "Pull completed successfully";
  }

  return {
    success: conflicts.length === 0,
    summary,
    filesChanged: filesMatch ? parseInt(filesMatch[1], 10) : 0,
    insertions: insertionsMatch ? parseInt(insertionsMatch[1], 10) : 0,
    deletions: deletionsMatch ? parseInt(deletionsMatch[1], 10) : 0,
    conflicts,
    ...(conflictFiles ? { conflictFiles } : {}),
    ...(changedFiles.length > 0 ? { changedFiles } : {}),
    ...(alreadyUpToDate ? { upToDate: true } : {}),
    ...(fastForward ? { fastForward: true } : {}),
  };
}

/** Parses `git checkout` output into structured checkout result data. */
export function parseCheckout(
  stdout: string,
  stderr: string,
  _ref: string,
  previousRef: string,
  created: boolean,
  modifiedFiles?: string[],
): GitCheckout {
  const combined = `${stdout}\n${stderr}`.trim();
  // Detect detached HEAD state
  const detached =
    /HEAD is now at/.test(combined) ||
    /detached.*HEAD/.test(combined) ||
    /HEAD.*detached/.test(combined);

  return {
    success: true,
    previousRef,
    created,
    ...(detached ? { detached: true } : {}),
    ...(modifiedFiles && modifiedFiles.length > 0 ? { modifiedFiles } : {}),
  };
}

/** Parses a failed `git checkout` into structured checkout error data. */
export function parseCheckoutError(
  stdout: string,
  stderr: string,
  ref: string,
  previousRef: string,
): GitCheckout {
  const combined = `${stdout}\n${stderr}`.trim();

  // Classify the error
  let errorType: GitCheckout["errorType"] = "unknown";
  const conflictFiles: string[] = [];

  // Dirty working tree: "error: Your local changes to the following files would be overwritten"
  if (
    /local changes.*would be overwritten/i.test(combined) ||
    /Please commit your changes or stash them/i.test(combined)
  ) {
    errorType = "dirty-tree";
    // Extract file names from "error: Your local changes to the following files would be overwritten by checkout:\n\tfile1.ts\n\tfile2.ts"
    const fileSection = combined.match(
      /would be overwritten by (?:checkout|merge):\n([\s\S]*?)(?:Please|Aborting)/,
    );
    if (fileSection) {
      const files = fileSection[1]
        .split("\n")
        .map((l) => l.trim())
        .filter(Boolean);
      conflictFiles.push(...files);
    }
  }
  // Merge conflicts
  else if (/CONFLICT/i.test(combined) || /merge conflict/i.test(combined)) {
    errorType = "conflict";
    const conflictPattern = /CONFLICT \(.*?\): (?:Merge conflict in )?(.+)/g;
    let match;
    while ((match = conflictPattern.exec(combined)) !== null) {
      conflictFiles.push(match[1].trim());
    }
  }
  // Invalid ref
  else if (
    /pathspec.*did not match/i.test(combined) ||
    /not a commit/i.test(combined) ||
    /invalid reference/i.test(combined)
  ) {
    errorType = "invalid-ref";
  }
  // Branch already exists
  else if (/already exists/i.test(combined)) {
    errorType = "already-exists";
  }

  return {
    success: false,
    previousRef,
    created: false,
    errorType,
    ...(conflictFiles.length > 0 ? { conflictFiles } : {}),
    errorMessage: combined,
  };
}

/** Parses `git tag -l --sort=-creatordate --format='%(refname:short)\t%(creatordate:iso-strict)\t%(subject)'` output into structured tag data. */
export function parseTagOutput(stdout: string): GitTagFull {
  const lines = stdout.split("\n").filter((line) => line.trim().length > 0);
  const tags = lines.map((line) => {
    const parts = line.split("\t");
    const [name, date, message, peeledObjectType] = parts;
    const hasTypeField = parts.length >= 4;
    return {
      name: name || "",
      ...(date ? { date } : {}),
      ...(message ? { message } : {}),
      ...(hasTypeField
        ? peeledObjectType
          ? { tagType: "annotated" as const }
          : { tagType: "lightweight" as const }
        : {}),
    };
  });

  return { tags };
}

/** Parses `git stash list --format='%gd\t%gs\t%ci'` output into structured stash list data. */
export function parseStashListOutput(stdout: string): GitStashListFull {
  const lines = stdout.trim().split("\n").filter(Boolean);
  const stashes = lines.map((line) => {
    const [ref, message, date] = line.split("\t");
    const indexMatch = ref?.match(/stash@\{(\d+)\}/);
    // Extract branch from message: "WIP on <branch>: ..." or "On <branch>: ..."
    const branchMatch = (message || "").match(/(?:WIP on|On)\s+([^:]+):/);
    return {
      index: indexMatch ? parseInt(indexMatch[1], 10) : 0,
      message: message || "",
      date: date || "",
      ...(branchMatch ? { branch: branchMatch[1] } : {}),
    };
  });

  return { stashes };
}

/** Parses `git stash push/pop/apply/drop/clear/show` output into structured stash result data. */
export function parseStashOutput(
  stdout: string,
  stderr: string,
  action: "push" | "pop" | "apply" | "drop" | "clear" | "show" | "branch",
): GitStash {
  const combined = `${stdout}\n${stderr}`.trim();

  // Handle show action
  if (action === "show") {
    return parseStashShowOutput(stdout, stderr);
  }

  // Extract stash reference from push output (e.g., "Saved working directory and index state WIP on main: abc1234 msg")
  let stashRef: string | undefined;
  if (action === "push") {
    // After a push, the new stash is always stash@{0}
    if (combined && !combined.includes("No local changes to save")) {
      stashRef = "stash@{0}";
    }
  } else if (action === "pop" || action === "apply" || action === "drop") {
    const refMatch = combined.match(/stash@\{\d+\}/);
    if (refMatch) stashRef = refMatch[0];
  }

  return {
    success: true,
    message: combined || `Stash ${action} completed successfully`,
    ...(stashRef ? { stashRef } : {}),
  };
}

/** Parses `git stash show` output into structured stash diff data. */
export function parseStashShowOutput(stdout: string, stderr: string): GitStash {
  // Preserve leading whitespace so file stat lines starting with spaces can be parsed
  const combined = `${stdout}\n${stderr}`.replace(/\s+$/, "");

  // Parse diffstat from --stat output
  // Example:
  //  src/index.ts | 10 +++++++---
  //  2 files changed, 7 insertions(+), 3 deletions(-)
  const filesMatch = combined.match(/(\d+)\s+files?\s+changed/);
  const insertionsMatch = combined.match(/(\d+)\s+insertions?\(\+\)/);
  const deletionsMatch = combined.match(/(\d+)\s+deletions?\(-\)/);

  // Parse per-file stats
  const files: Array<{ file: string; insertions?: number; deletions?: number }> = [];
  const fileStatPattern = /^\s+(\S.*?)\s+\|\s+(\d+)\s*([+-]*)/gm;
  let match;
  while ((match = fileStatPattern.exec(combined)) !== null) {
    const file = match[1].trim();
    const totalChanges = parseInt(match[2], 10);
    const changeChars = match[3] || "";
    const plusCount = (changeChars.match(/\+/g) || []).length;
    const minusCount = (changeChars.match(/-/g) || []).length;

    if (plusCount + minusCount > 0) {
      const ratio = totalChanges / (plusCount + minusCount);
      files.push({
        file,
        insertions: Math.round(plusCount * ratio),
        deletions: Math.round(minusCount * ratio),
      });
    } else {
      files.push({ file });
    }
  }

  // Check if patch content is present (lines starting with diff/---/+++/@@ or +/-)
  let patch: string | undefined;
  const patchMatch = combined.match(/(^diff --git .+)/ms);
  if (patchMatch) {
    patch = patchMatch[0];
  }

  const diffStat = {
    filesChanged: filesMatch ? parseInt(filesMatch[1], 10) : 0,
    insertions: insertionsMatch ? parseInt(insertionsMatch[1], 10) : 0,
    deletions: deletionsMatch ? parseInt(deletionsMatch[1], 10) : 0,
    ...(files.length > 0 ? { files } : {}),
  };

  return {
    success: true,
    message: combined || "Stash show completed",
    diffStat,
    ...(patch ? { patch } : {}),
  };
}

/** Parses a failed `git stash` into structured stash error data. */
export function parseStashError(
  stdout: string,
  stderr: string,
  action: "push" | "pop" | "apply" | "drop" | "clear" | "show" | "branch",
): GitStash {
  const combined = `${stdout}\n${stderr}`.trim();

  // Nothing to stash
  if (/No local changes to save/i.test(combined)) {
    return {
      success: false,
      message: combined,
      reason: "no-local-changes",
    };
  }

  // Stash pop/apply conflicts
  if (/CONFLICT/i.test(combined) || /conflict/i.test(combined)) {
    const conflictFiles: string[] = [];
    // Pattern: "CONFLICT (content): Merge conflict in <file>"
    const conflictPattern = /CONFLICT \(.*?\): (?:Merge conflict in )?(.+)/g;
    let match;
    while ((match = conflictPattern.exec(combined)) !== null) {
      conflictFiles.push(match[1].trim());
    }

    // Extract stash ref if available
    const refMatch = combined.match(/stash@\{\d+\}/);
    const stashRef = refMatch ? refMatch[0] : undefined;

    return {
      success: false,
      message: combined,
      reason: "conflict",
      ...(conflictFiles.length > 0 ? { conflictFiles } : {}),
      ...(stashRef ? { stashRef } : {}),
    };
  }

  // No stash entries
  if (/No stash entries found/i.test(combined) || /does not exist/i.test(combined)) {
    return {
      success: false,
      message: combined,
      reason: "no-stash-entries",
    };
  }

  // Dirty index (can't pop due to staged changes)
  if (/saved state.*could not be applied/i.test(combined) || /dirty.*index/i.test(combined)) {
    return {
      success: false,
      message: combined,
      reason: "dirty-index",
    };
  }

  // Generic failure
  return {
    success: false,
    message: combined || `Stash ${action} failed`,
    reason: "unknown",
  };
}

/** Detects URL protocol from a git remote URL. */
function detectProtocol(url: string): "ssh" | "https" | "http" | "git" | "file" | "unknown" {
  if (url.startsWith("https://")) return "https";
  if (url.startsWith("http://")) return "http";
  if (url.startsWith("git://")) return "git";
  if (url.startsWith("file://") || url.startsWith("/")) return "file";
  // SSH patterns: git@host:path or ssh://user@host/path
  if (url.startsWith("ssh://") || /^[^/]+@[^/]+:/.test(url)) return "ssh";
  return "unknown";
}

/** Parses `git remote -v` output into structured remote data, grouping fetch/push URLs by name. */
export function parseRemoteOutput(stdout: string): GitRemoteFull {
  const lines = stdout.trim().split("\n").filter(Boolean);
  const remoteMap = new Map<string, { fetchUrl: string; pushUrl: string }>();

  for (const line of lines) {
    const match = line.match(/^(\S+)\s+(\S+)\s+\((fetch|push)\)$/);
    if (!match) continue;
    const [, name, url, type] = match;
    if (!remoteMap.has(name)) {
      remoteMap.set(name, { fetchUrl: "", pushUrl: "" });
    }
    const entry = remoteMap.get(name)!;
    if (type === "fetch") entry.fetchUrl = url;
    else entry.pushUrl = url;
  }

  const remotes = Array.from(remoteMap.entries()).map(([name, urls]) => ({
    name,
    fetchUrl: urls.fetchUrl,
    pushUrl: urls.pushUrl,
    protocol: detectProtocol(urls.fetchUrl),
  }));

  return { remotes };
}

/** Parses `git remote show <name>` output into structured data. */
export function parseRemoteShow(stdout: string): {
  fetchUrl?: string;
  pushUrl?: string;
  headBranch?: string;
  remoteBranches?: string[];
  localBranches?: string[];
} {
  const fetchUrlMatch = stdout.match(/Fetch URL:\s+(.+)/);
  const pushUrlMatch = stdout.match(/Push\s+URL:\s+(.+)/);
  const headMatch = stdout.match(/HEAD branch:\s+(.+)/);

  // Split output into lines for section-based parsing
  const lines = stdout.split("\n");

  // Parse remote branches section
  const remoteBranches: string[] = [];
  let inRemoteBranches = false;
  // Parse local branches section
  const localBranches: string[] = [];
  let inLocalBranches = false;

  for (const line of lines) {
    // Detect section headers (non-indented lines with a colon)
    if (/^\s{2}\S/.test(line) && line.includes(":") && !line.startsWith("    ")) {
      // This is a section header like "  Remote branches:" or "  Local branches configured..."
      if (/Remote branch/i.test(line)) {
        inRemoteBranches = true;
        inLocalBranches = false;
        continue;
      } else if (/Local branch.*configured for.*git pull/i.test(line)) {
        inRemoteBranches = false;
        inLocalBranches = true;
        continue;
      } else {
        // Any other section header ends current section
        inRemoteBranches = false;
        inLocalBranches = false;
        continue;
      }
    }

    // Indented lines within a section (4+ spaces)
    if (/^\s{4,}/.test(line) && line.trim()) {
      const branchName = line.trim().split(/\s+/)[0];
      if (branchName) {
        if (inRemoteBranches) remoteBranches.push(branchName);
        else if (inLocalBranches) localBranches.push(branchName);
      }
    } else if (line.trim() === "" || /^\*/.test(line)) {
      // Blank line or top-level header — don't change section state
    } else if (!/^\s/.test(line) && line.trim()) {
      // Non-indented non-empty line — end any section
      inRemoteBranches = false;
      inLocalBranches = false;
    }
  }

  return {
    ...(fetchUrlMatch ? { fetchUrl: fetchUrlMatch[1].trim() } : {}),
    ...(pushUrlMatch ? { pushUrl: pushUrlMatch[1].trim() } : {}),
    ...(headMatch ? { headBranch: headMatch[1].trim() } : {}),
    ...(remoteBranches.length > 0 ? { remoteBranches } : {}),
    ...(localBranches.length > 0 ? { localBranches } : {}),
  };
}

/** Parses `git remote prune` output into list of pruned branches. */
export function parseRemotePrune(stdout: string, stderr: string): string[] {
  const combined = `${stdout}\n${stderr}`.trim();
  const prunedBranches: string[] = [];

  // Pattern: " * [pruned] origin/feature-branch"
  const prunePattern = /\*\s+\[pruned\]\s+(\S+)/g;
  let match;
  while ((match = prunePattern.exec(combined)) !== null) {
    prunedBranches.push(match[1]);
  }

  return prunedBranches;
}

/** Parses `git blame --porcelain` output into structured blame data grouped by commit.
 *  Uses full 40-character hashes for collision safety. */
export function parseBlameOutput(stdout: string, file: string): GitBlameFull {
  const rawLines = stdout.split("\n");

  let currentHash = "";
  let currentAuthor = "";
  let currentEmail = "";
  let currentDate = "";
  let currentLineNumber = 0;

  // Track commit info we've seen (porcelain only shows full info once per commit)
  const commitInfo = new Map<string, { author: string; email?: string; date: string }>();

  // Build commit groups in encounter order (keyed by full 40-char hash)
  const commitOrder: string[] = [];
  const commitGroups = new Map<
    string,
    {
      author: string;
      email?: string;
      date: string;
      lines: Array<{ lineNumber: number; content: string }>;
    }
  >();

  let i = 0;
  while (i < rawLines.length) {
    const line = rawLines[i];

    // Hash line: <hash> <orig-line> <final-line> [<num-lines>]
    const hashMatch = line.match(/^([a-f0-9]{40})\s+(\d+)\s+(\d+)/);
    if (hashMatch) {
      currentHash = hashMatch[1];
      currentLineNumber = parseInt(hashMatch[3], 10);

      // If we already have info for this commit, use it
      const existing = commitInfo.get(currentHash);
      if (existing) {
        currentAuthor = existing.author;
        currentEmail = existing.email || "";
        currentDate = existing.date;
      }

      i++;
      continue;
    }

    // Key-value pairs
    if (line.startsWith("author ")) {
      currentAuthor = line.slice(7);
      i++;
      continue;
    }

    if (line.startsWith("author-mail ")) {
      // Extract email, strip angle brackets: "<user@example.com>" -> "user@example.com"
      currentEmail = line.slice(12).replace(/^<|>$/g, "");
      i++;
      continue;
    }

    if (line.startsWith("author-time ")) {
      const timestamp = parseInt(line.slice(12), 10);
      currentDate = new Date(timestamp * 1000).toISOString();
      i++;
      continue;
    }

    // Content line (prefixed with tab)
    if (line.startsWith("\t")) {
      // Store commit info for reuse
      if (!commitInfo.has(currentHash)) {
        commitInfo.set(currentHash, {
          author: currentAuthor,
          date: currentDate,
          ...(currentEmail ? { email: currentEmail } : {}),
        });
      }

      // Use full 40-char hash for collision safety (Gap #127)
      const fullHash = currentHash;
      let group = commitGroups.get(fullHash);
      if (!group) {
        group = {
          author: currentAuthor,
          date: currentDate,
          ...(currentEmail ? { email: currentEmail } : {}),
          lines: [],
        };
        commitGroups.set(fullHash, group);
        commitOrder.push(fullHash);
      }
      group.lines.push({ lineNumber: currentLineNumber, content: line.slice(1) });

      i++;
      continue;
    }

    // Skip other porcelain metadata lines (author-mail, author-tz, committer-*, summary, filename, boundary, etc.)
    i++;
  }

  const commits = commitOrder.map((hash) => ({
    hash,
    ...commitGroups.get(hash)!,
  }));

  return { commits, file };
}

/** Parses `git restore` result into structured restore data.
 *  Since `git restore` produces no stdout on success, we return the file list that was passed in.
 *  If verification data is provided, includes per-file verification status. */
export function parseRestore(
  files: string[],
  source: string,
  staged: boolean,
  verifiedFiles?: Array<{ file: string; restored: boolean }>,
): GitRestore {
  return {
    restored: files,
    source,
    staged,
    ...(verifiedFiles
      ? {
          verified: verifiedFiles.every((f) => f.restored),
          verifiedFiles,
        }
      : {}),
  };
}

/** Parses a failed `git restore` command into structured error output. */
export function parseRestoreError(
  stderr: string,
  files: string[],
  source: string,
  staged: boolean,
): GitRestore {
  const combined = stderr.trim();
  let errorType: GitRestore["errorType"] = "unknown";
  if (/pathspec .* did not match/i.test(combined)) errorType = "pathspec";
  else if (/unmerged/i.test(combined) || /is unmerged/i.test(combined)) errorType = "unmerged";
  else if (/invalid object name|bad revision|unknown revision/i.test(combined))
    errorType = "invalid-source";

  return {
    success: false,
    restored: [],
    source,
    staged,
    errorType,
    errorMessage: combined,
  };
}

/** Parses `git reset` output into structured reset data with the ref, mode, and list of affected files. */
export function parseReset(
  stdout: string,
  stderr: string,
  ref: string,
  mode?: string,
  previousRef?: string,
  newRef?: string,
): GitReset {
  const combined = `${stdout}\n${stderr}`.trim();
  const filesAffected: string[] = [];

  for (const line of combined.split("\n")) {
    const match = line.match(/^[A-Z]\t(.+)$/);
    if (match) {
      filesAffected.push(match[1]);
    }
  }

  return {
    ref,
    ...(mode ? { mode: mode as GitReset["mode"] } : {}),
    ...(previousRef ? { previousRef } : {}),
    ...(newRef ? { newRef } : {}),
    filesAffected,
  };
}

/** Parses a failed `git reset` command into structured error output. */
export function parseResetError(stderr: string, ref: string, mode?: string): GitReset {
  const combined = stderr.trim();
  let errorType: GitReset["errorType"] = "unknown";
  if (/unknown revision|ambiguous argument|bad revision/i.test(combined)) errorType = "invalid-ref";
  else if (/pathspec .* did not match/i.test(combined)) errorType = "pathspec";
  else if (/cannot .* with paths|Cannot use --/i.test(combined)) errorType = "incompatible-args";

  return {
    success: false,
    ref,
    ...(mode ? { mode: mode as GitReset["mode"] } : {}),
    filesAffected: [],
    errorType,
    errorMessage: combined,
  };
}

/** Validates that reset files+mode combination is valid.
 *  --hard/--soft/--mixed + specific files is invalid in git.
 *  Returns an error message if invalid, undefined if valid. */
export function validateResetArgs(
  mode: string | undefined,
  files: string[] | undefined,
): string | undefined {
  if (files && files.length > 0 && mode && ["hard", "soft", "merge", "keep"].includes(mode)) {
    return (
      `Cannot use --${mode} with specific files. Only --mixed (or no mode) supports file-level reset. ` +
      `To reset specific files, omit the mode or use mode='mixed'. ` +
      `To reset the entire branch, omit the files parameter.`
    );
  }
  return undefined;
}

/** Parses `git cherry-pick` output into structured cherry-pick result data. */
export function parseCherryPick(
  stdout: string,
  stderr: string,
  exitCode: number,
  commits: string[],
): GitCherryPick {
  const combined = `${stdout}\n${stderr}`.trim();

  const conflicts: string[] = [];
  const conflictPattern = /CONFLICT \(.*?\): (?:Merge conflict in )?(.+)/g;
  let match;
  while ((match = conflictPattern.exec(combined)) !== null) {
    conflicts.push(match[1].trim());
  }

  // Try to extract new commit hash from output
  const newCommitMatch = combined.match(/\[[\w/.-]+\s+([a-f0-9]{7,40})\]/);
  const newCommitHash = newCommitMatch ? newCommitMatch[1] : undefined;

  if (exitCode !== 0 && conflicts.length > 0) {
    return {
      success: false,
      state: "conflict",
      applied: [],
      conflicts,
    };
  }

  if (/cherry-pick.*abort/i.test(combined) || /abort/i.test(combined)) {
    if (exitCode === 0) {
      return {
        success: true,
        state: "completed",
        applied: [],
        conflicts: [],
      };
    }
  }

  if (exitCode === 0) {
    return {
      success: true,
      state: "completed",
      applied: commits,
      conflicts: [],
      ...(newCommitHash ? { newCommitHash } : {}),
    };
  }

  // Non-zero exit with no conflicts detected — likely in-progress or other error
  return {
    success: false,
    state: conflicts.length > 0 ? "conflict" : "in-progress",
    applied: [],
    conflicts,
  };
}

function classifyMergeError(combined: string): GitMerge["errorType"] {
  if (/CONFLICT/i.test(combined)) return "conflict";
  if (
    /local changes.*would be overwritten|Please commit your changes or stash them/i.test(combined)
  )
    return "local-changes";
  if (/refusing to merge unrelated histories/i.test(combined)) return "unrelated-histories";
  if (/not something we can merge|not something to merge|is not a valid object/i.test(combined))
    return "invalid-branch";
  return "unknown";
}

/** Parses `git merge` output into structured merge result data with conflict detection. */
export function parseMerge(
  stdout: string,
  stderr: string,
  branch: string,
  mergeBase?: string,
): GitMerge {
  const combined = `${stdout}\n${stderr}`.trim();

  // Check for "Already up to date"
  const alreadyUpToDate = /Already up to date/i.test(combined);

  // Check for conflicts
  const mergeConflicts: string[] = [];
  const mergeConflictPattern = /CONFLICT \(.*?\): (?:Merge conflict in )?(.+)/g;
  let mergeMatch;
  while ((mergeMatch = mergeConflictPattern.exec(combined)) !== null) {
    mergeConflicts.push(mergeMatch[1].trim());
  }

  if (mergeConflicts.length > 0) {
    return {
      merged: false,
      state: "conflict",
      fastForward: false,
      branch,
      ...(mergeBase ? { mergeBase } : {}),
      conflicts: mergeConflicts,
      errorType: "conflict",
      errorMessage: combined,
    };
  }

  if (alreadyUpToDate) {
    return {
      merged: true,
      state: "already-up-to-date",
      fastForward: false,
      branch,
      ...(mergeBase ? { mergeBase } : {}),
      conflicts: [],
    };
  }

  // Detect fast-forward
  const fastForward = /Fast-forward|fast-forward/i.test(combined);

  // Extract merge commit hash from output
  const hashMatch = combined.match(/([a-f0-9]{7,40})\.\.[a-f0-9]{7,40}/);
  const commitHash = hashMatch ? hashMatch[0].split("..")[1] : undefined;

  // Non-conflict errors should be returned as structured failures.
  const hasError =
    /error:|fatal:/i.test(combined) &&
    !/Already up to date|Fast-forward|Merge made by|Automatic merge/i.test(combined);
  if (hasError) {
    return {
      merged: false,
      state: "failed",
      fastForward: false,
      branch,
      ...(mergeBase ? { mergeBase } : {}),
      conflicts: [],
      errorType: classifyMergeError(combined),
      errorMessage: combined,
    };
  }

  return {
    merged: true,
    state: fastForward ? "fast-forward" : "completed",
    fastForward,
    branch,
    ...(mergeBase ? { mergeBase } : {}),
    conflicts: [],
    ...(commitHash ? { commitHash } : {}),
  };
}

/** Parses `git merge --abort` output into structured merge result data. */
export function parseMergeAbort(_stdout: string, _stderr: string): GitMerge {
  return {
    merged: false,
    state: "completed",
    fastForward: false,
    branch: "",
    conflicts: [],
  };
}

/** Parses `git rebase` output into structured rebase result data with conflict detection. */
export function parseRebase(
  stdout: string,
  stderr: string,
  branch: string,
  current: string,
): GitRebase {
  const combined = `${stdout}\n${stderr}`.trim();

  const conflicts: string[] = [];
  const conflictPattern2 = /CONFLICT \(.*?\): (?:Merge conflict in )?(.+)/g;
  let match2;
  while ((match2 = conflictPattern2.exec(combined)) !== null) {
    conflicts.push(match2[1].trim());
  }

  let rebasedCommits: number | undefined;
  const applyMatches = combined.match(/Applying: /g);
  if (applyMatches) {
    rebasedCommits = applyMatches.length;
  }
  if (rebasedCommits === undefined && /Successfully rebased/.test(combined)) {
    rebasedCommits = 0;
  }

  // Determine state
  const deriveState = (
    hasConflicts: boolean,
    isAbort: boolean,
  ): "completed" | "conflict" | "in-progress" => {
    if (hasConflicts) return "conflict";
    if (isAbort) return "completed";
    if (/Successfully rebased/.test(combined)) return "completed";
    if (/could not apply/.test(combined)) return "in-progress";
    return "completed";
  };

  if (!branch && conflicts.length === 0) {
    return {
      success: true,
      state: deriveState(false, true),
      branch: "",
      current,
      conflicts: [],
    };
  }

  if (/Successfully rebased/.test(combined) && conflicts.length === 0) {
    return {
      success: true,
      state: "completed",
      branch,
      current,
      conflicts: [],
      ...(rebasedCommits !== undefined ? { rebasedCommits } : {}),
    };
  }

  return {
    success: conflicts.length === 0,
    state: deriveState(conflicts.length > 0, false),
    branch,
    current,
    conflicts,
    ...(rebasedCommits !== undefined ? { rebasedCommits } : {}),
  };
}

/** Parses refs string like "HEAD -> main, origin/main, tag: v1.0" into array of individual refs. */
function parseRefsString(refs: string): string[] {
  return refs
    .split(",")
    .map((r) => r.trim())
    .filter(Boolean);
}

/** Parses `git log --graph --oneline --decorate` output into structured log-graph data.
 *  Each line is split into graph characters (the ASCII art prefix) and the commit info. */
export function parseLogGraph(stdout: string): GitLogGraphFull {
  const lines = stdout.trim().split("\n").filter(Boolean);
  const commits: GitLogGraphFull["commits"] = [];

  for (const line of lines) {
    // Graph lines contain ASCII art (|, /, \, *, space) followed by a short hash + message.
    // The commit marker is '*'. Lines without '*' are pure graph continuation lines;
    // we still include them to preserve topology.
    // Pattern: graph chars end where the short hash begins (first hex word after graph art).
    const commitMatch = line.match(/^([|/\\\s*_.-]+?)\s([a-f0-9]{7,40})\s?(.*)$/);
    if (commitMatch) {
      const graph = commitMatch[1];
      const hashShort = commitMatch[2];
      let rest = commitMatch[3] ?? "";

      // Parents are emitted when log-graph uses `%p` in pretty format.
      // Parse consecutive hash-like tokens immediately after the commit hash.
      const parents: string[] = [];
      while (true) {
        const parentMatch = rest.match(/^([a-f0-9]{7,40})\s+(.*)$/);
        if (!parentMatch) break;
        parents.push(parentMatch[1]);
        rest = parentMatch[2];
      }

      // Extract refs from decoration: (HEAD -> main, origin/main, tag: v1.0)
      let refs: string | undefined;
      let parsedRefs: string[] | undefined;
      const refsMatch = rest.match(/^\(([^)]+)\)\s*/);
      if (refsMatch) {
        refs = refsMatch[1];
        parsedRefs = parseRefsString(refs);
        rest = rest.slice(refsMatch[0].length);
      }

      const isMerge = parents.length > 1 || /Merge\s/.test(rest) || /^\*\s{2,}/.test(graph);

      commits.push({
        graph,
        hashShort,
        message: rest,
        ...(parents.length > 0 ? { parents } : {}),
        ...(refs ? { refs } : {}),
        ...(parsedRefs ? { parsedRefs } : {}),
        ...(isMerge ? { isMerge: true } : {}),
      });
    } else {
      // Pure graph continuation line (no commit) — store with empty hash/message
      // to preserve the visual topology
      commits.push({
        graph: line,
        hashShort: "",
        message: "",
      });
    }
  }

  return { commits };
}

/**
 * Normalizes raw git reflog action strings into consistent enum values.
 * Different git versions produce different action strings:
 * - "commit (initial)" vs "commit: initial" -> "commit-initial"
 * - "commit (amend)" vs "commit: amend" -> "commit-amend"
 * - "checkout: moving from X to Y" -> "checkout"
 * - "rebase (finish)" / "rebase finished" -> "rebase-finish"
 * - "rebase (pick)" -> "rebase-pick"
 * - "rebase (reword)" -> "rebase-reword"
 * - "rebase (edit)" -> "rebase-edit"
 * - "rebase (squash)" -> "rebase-squash"
 * - "rebase (fixup)" -> "rebase-fixup"
 * - "rebase -i (pick)" -> "rebase-pick"
 * - "rebase (abort)" -> "rebase-abort"
 * - "merge <branch>" -> "merge"
 */
export function normalizeReflogAction(rawAction: string): ReflogAction {
  const lower = rawAction.toLowerCase().trim();

  // commit variants
  if (/^commit\s*\(initial\)$/.test(lower) || lower === "commit: initial") return "commit-initial";
  if (/^commit\s*\(amend\)$/.test(lower) || lower === "commit: amend") return "commit-amend";
  if (/^commit$/.test(lower)) return "commit";

  // checkout
  if (/^checkout/.test(lower)) return "checkout";

  // rebase variants
  if (/^rebase\s*(?:-i\s*)?\(finish\)$/.test(lower) || /^rebase finish/.test(lower))
    return "rebase-finish";
  if (/^rebase\s*(?:-i\s*)?\(abort\)$/.test(lower) || /^rebase abort/.test(lower))
    return "rebase-abort";
  if (/^rebase\s*(?:-i\s*)?\(pick\)$/.test(lower)) return "rebase-pick";
  if (/^rebase\s*(?:-i\s*)?\(reword\)$/.test(lower)) return "rebase-reword";
  if (/^rebase\s*(?:-i\s*)?\(edit\)$/.test(lower)) return "rebase-edit";
  if (/^rebase\s*(?:-i\s*)?\(squash\)$/.test(lower)) return "rebase-squash";
  if (/^rebase\s*(?:-i\s*)?\(fixup\)$/.test(lower)) return "rebase-fixup";
  if (/^rebase/.test(lower)) return "rebase";

  // merge (may include branch name: "merge feature")
  if (/^merge/.test(lower)) return "merge";

  // pull
  if (/^pull/.test(lower)) return "pull";

  // reset
  if (/^reset/.test(lower)) return "reset";

  // branch
  if (/^branch/.test(lower)) return "branch";

  // clone
  if (/^clone/.test(lower)) return "clone";

  // cherry-pick
  if (/^cherry-pick/.test(lower)) return "cherry-pick";

  // stash
  if (/^stash/.test(lower)) return "stash";

  return "other";
}

/** Parses custom-formatted `git reflog` output (tab-delimited: %H\t%h\t%gd\t%gs\t%ci) into structured reflog entries. */
export function parseReflogOutput(stdout: string): GitReflogFull {
  const lines = stdout.trim().split("\n").filter(Boolean);
  const entries = lines.map((line) => {
    const [hash, shortHash, selector, subject, date] = line.split("\t");
    // Split subject into action and description: "checkout: moving from main to feature"
    const colonIdx = (subject || "").indexOf(": ");
    const rawAction = colonIdx >= 0 ? (subject || "").slice(0, colonIdx) : subject || "";
    const description = colonIdx >= 0 ? (subject || "").slice(colonIdx + 2) : "";
    const action = normalizeReflogAction(rawAction);
    const selectorIndexMatch = (selector || "").match(/@\{(\d+)\}/);
    const selectorIndex = selectorIndexMatch ? parseInt(selectorIndexMatch[1], 10) : undefined;
    const moveMatch = description.match(/moving from (\S+) to (\S+)/i);

    return {
      hash: hash || "",
      shortHash: shortHash || "",
      selector: selector || "",
      ...(selectorIndex !== undefined ? { selectorIndex } : {}),
      action,
      rawAction,
      description,
      ...(moveMatch ? { fromRef: moveMatch[1], toRef: moveMatch[2] } : {}),
      date: date || "",
    };
  });

  return { entries };
}

/** Parses `git bisect` output into structured bisect result data. */
export function parseBisect(
  stdout: string,
  stderr: string,
  action: GitBisect["action"],
): GitBisect {
  const combined = `${stdout}\n${stderr}`.trim();

  // Check if bisect found the culprit commit
  // Example: "<hash> is the first bad commit\ncommit <hash>\nAuthor: ...\nDate: ...\n\n    message"
  const culpritMatch = combined.match(/^([a-f0-9]{40}) is the first bad commit/);
  if (culpritMatch) {
    const hash = culpritMatch[1];
    const authorMatch = combined.match(/Author:\s+(.+)/);
    const dateMatch = combined.match(/Date:\s+(.+)/);
    // Message is after the blank line following headers
    const messageMatch = combined.match(/\n\n\s{4}(.+)/);

    return {
      action,
      result: {
        hash,
        message: messageMatch?.[1]?.trim() || "",
        ...(authorMatch ? { author: authorMatch[1].trim() } : {}),
        ...(dateMatch ? { date: dateMatch[1].trim() } : {}),
      },
      message: combined,
    };
  }

  // Parse remaining work from bisect progress.
  // Prefer git's "roughly N steps"; fallback to log2 estimate from revisions left.
  const bisectingMatch = combined.match(
    /Bisecting:\s+(\d+)\s+revisions?\s+left(?:\s+to test)?(?:.*roughly\s+(\d+)\s+steps?)?/i,
  );
  let remaining: number | undefined;
  if (bisectingMatch) {
    const revisionsLeft = parseInt(bisectingMatch[1], 10);
    const roughSteps = bisectingMatch[2] ? parseInt(bisectingMatch[2], 10) : undefined;
    remaining =
      roughSteps !== undefined
        ? roughSteps
        : revisionsLeft > 0
          ? Math.max(1, Math.ceil(Math.log2(revisionsLeft + 1)))
          : 0;
  }

  // Parse current commit: "[<hash>] message" on the last line
  const commitMatch = combined.match(/\[([a-f0-9]{7,40})\]\s+(.+)/);
  const current = commitMatch?.[1];

  return {
    action,
    ...(current ? { current } : {}),
    ...(remaining !== undefined ? { remaining } : {}),
    message: combined || `Bisect ${action} completed`,
  };
}

/** Parses `git worktree list --porcelain` output into structured worktree list data. */
export function parseWorktreeList(stdout: string): GitWorktreeListFull {
  // Porcelain format outputs blocks separated by blank lines:
  //   worktree /path/to/worktree
  //   HEAD abc1234...
  //   branch refs/heads/main
  //
  //   worktree /path/to/other
  //   HEAD def5678...
  //   branch refs/heads/feature
  //   locked
  //
  // Bare repos show "bare" instead of "branch ..."
  // Locked worktrees show "locked" or "locked <reason>"
  // Prunable worktrees show "prunable"
  const blocks = stdout.trim().split(/\n\n+/).filter(Boolean);
  const worktrees = blocks.map((block) => {
    const lines = block.split("\n");
    let path = "";
    let head = "";
    let branch = "";
    let bare = false;
    let locked: boolean | undefined;
    let lockReason: string | undefined;
    let prunable: boolean | undefined;

    for (const line of lines) {
      if (line.startsWith("worktree ")) {
        path = line.slice("worktree ".length);
      } else if (line.startsWith("HEAD ")) {
        head = line.slice("HEAD ".length);
      } else if (line.startsWith("branch ")) {
        // Strip refs/heads/ prefix for readability
        branch = line.slice("branch ".length).replace(/^refs\/heads\//, "");
      } else if (line === "bare") {
        bare = true;
      } else if (line === "detached") {
        branch = "(detached)";
      } else if (line === "locked" || line.startsWith("locked ")) {
        locked = true;
        const reason = line.slice("locked".length).trim();
        if (reason) lockReason = reason;
      } else if (line === "prunable" || line.startsWith("prunable ")) {
        prunable = true;
      }
    }

    return {
      path,
      head,
      branch,
      bare,
      ...(locked ? { locked } : {}),
      ...(lockReason ? { lockReason } : {}),
      ...(prunable ? { prunable } : {}),
    };
  });

  return { worktrees };
}

/** Parses `git worktree add/remove` output into structured worktree result data. */
export function parseWorktreeResult(
  stdout: string,
  stderr: string,
  path: string,
  branch: string,
): GitWorktree {
  // Try to extract HEAD commit from output
  const combined = `${stdout}\n${stderr}`.trim();
  const headMatch = combined.match(/HEAD is now at ([a-f0-9]{7,40})/);
  const head = headMatch ? headMatch[1] : undefined;

  return {
    success: true,
    path,
    branch,
    ...(head ? { head } : {}),
  };
}

/** Parses `git bisect run <cmd>` output into structured bisect run result data. */
export function parseBisectRun(stdout: string, stderr: string): GitBisect {
  const combined = `${stdout}\n${stderr}`.trim();

  // Count the number of bisect steps (lines like "running ..." or "Bisecting:")
  const runningLines = combined.match(/^running\s+/gm);
  const stepsRun = runningLines ? runningLines.length : 0;

  // Check if bisect found the culprit commit
  const culpritMatch = combined.match(/([a-f0-9]{40}) is the first bad commit/);
  if (culpritMatch) {
    const hash = culpritMatch[1];
    const authorMatch = combined.match(/Author:\s+(.+)/);
    const dateMatch = combined.match(/Date:\s+(.+)/);
    const messageMatch = combined.match(/\n\n\s{4}(.+)/);

    // Extract the command from first "running" line
    const cmdMatch = combined.match(/^running\s+'?(.+?)'?\s*$/m);
    const command = cmdMatch ? cmdMatch[1] : "unknown";

    return {
      action: "run",
      command,
      stepsRun,
      result: {
        hash,
        message: messageMatch?.[1]?.trim() || "",
        ...(authorMatch ? { author: authorMatch[1].trim() } : {}),
        ...(dateMatch ? { date: dateMatch[1].trim() } : {}),
      },
      message: combined,
    };
  }

  // No culprit found — bisect run might still be in progress or failed
  const cmdMatch = combined.match(/^running\s+'?(.+?)'?\s*$/m);
  const command = cmdMatch ? cmdMatch[1] : "unknown";

  return {
    action: "run",
    command,
    stepsRun,
    message: combined || "Bisect run completed without identifying a commit",
  };
}

// ── Submodule parsers ───────────────────────────────────────────────────

/**
 * Parses `git submodule status` output into structured submodule entries.
 *
 * Each line has format: `<status><sha> <path> (<branch>)` where status prefix is:
 * - ` ` (space) = up-to-date
 * - `+` = modified (checked out to different commit)
 * - `-` = uninitialized
 * - `U` = merge conflict (treated as modified)
 */
export function parseSubmoduleStatus(stdout: string): GitSubmoduleEntry[] {
  const lines = stdout.split("\n").filter(Boolean);
  return lines.map((line) => {
    const trimmed = line.trimStart();
    const prefix = line.length > trimmed.length ? line[line.length - trimmed.length - 1] : line[0];

    let statusChar: string;
    let rest: string;

    if (prefix === "+" || prefix === "-" || prefix === "U") {
      statusChar = prefix;
      rest = line.slice(1).trimStart();
    } else {
      // Space prefix or no prefix = up-to-date
      statusChar = " ";
      rest = trimmed;
    }

    const parts = rest.split(/\s+/);
    const sha = parts[0] || "";
    const path = parts[1] || "";
    // Branch info is in parentheses at the end, e.g., "(heads/main)"
    const branchMatch = rest.match(/\((.+)\)\s*$/);
    const branch = branchMatch ? branchMatch[1] : undefined;

    let status: GitSubmoduleEntry["status"];
    if (statusChar === "-") {
      status = "uninitialized";
    } else if (statusChar === "+" || statusChar === "U") {
      status = "modified";
    } else {
      status = "up-to-date";
    }

    return { path, sha, branch, status };
  });
}

// ── Clean parsers ───────────────────────────────────────────────────────

/**
 * Parses `git clean --dry-run` or `git clean -f` output into structured data.
 *
 * Dry-run lines: "Would remove <file>"
 * Force lines: "Removing <file>"
 */
export function parseCleanOutput(stdout: string, dryRun: boolean): GitClean {
  const lines = stdout.split("\n").filter(Boolean);
  const files: string[] = [];

  for (const line of lines) {
    const wouldRemove = line.match(/^Would remove\s+(.+)/);
    const removing = line.match(/^Removing\s+(.+)/);
    if (wouldRemove) {
      files.push(wouldRemove[1].trim());
    } else if (removing) {
      files.push(removing[1].trim());
    }
  }

  const verb = dryRun ? "would be removed" : "removed";
  return {
    files,
    message:
      files.length > 0
        ? `${files.length} file(s) ${verb}`
        : `No files ${dryRun ? "to remove" : "removed"}`,
  };
}

// ── Config parsers ──────────────────────────────────────────────────────

/**
 * Parses `git config --list` output into structured config entries.
 * Each line has format: `key=value`
 */
export function parseConfigList(
  stdout: string,
  scope?: "local" | "global" | "system" | "worktree",
): GitConfigEntry[] {
  const lines = stdout.split("\n").filter(Boolean);
  return lines.map((line) => {
    const eqIdx = line.indexOf("=");
    if (eqIdx === -1) {
      return { key: line.trim(), value: "", ...(scope ? { scope } : {}) };
    }
    return {
      key: line.slice(0, eqIdx).trim(),
      value: line.slice(eqIdx + 1).trim(),
      ...(scope ? { scope } : {}),
    };
  });
}
