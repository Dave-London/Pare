import type {
  GitStatus,
  GitLog,
  GitDiff,
  GitBranch,
  GitShow,
  GitAdd,
  GitCommit,
  GitPull,
  GitPush,
  GitCheckout,
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

/** Parses custom-formatted `git log` output (delimited by `@@`) into structured commit entries. */
export function parseLog(stdout: string): GitLog {
  // Format: hash|hashShort|author|email|date|refs|message
  const DELIMITER = "@@";
  const lines = stdout.trim().split("\n").filter(Boolean);
  const commits = lines.map((line) => {
    const [hash, hashShort, author, email, date, refs, ...messageParts] = line.split(DELIMITER);
    return {
      hash,
      hashShort,
      author,
      email,
      date,
      message: messageParts.join(DELIMITER),
      ...(refs ? { refs } : {}),
    };
  });

  return { commits, total: commits.length };
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
      ...(isRename && renameMatch ? { oldFile: renameMatch[1] ?? renameMatch[0] } : {}),
    };
  });

  return {
    files,
    totalAdditions: files.reduce((sum, f) => sum + f.additions, 0),
    totalDeletions: files.reduce((sum, f) => sum + f.deletions, 0),
    totalFiles: files.length,
  };
}

/** Parses `git branch` output into a structured list of branches with the current branch marked. */
export function parseBranch(stdout: string): GitBranch {
  const lines = stdout.trim().split("\n").filter(Boolean);
  let current = "";
  const branches = lines.map((line) => {
    const isCurrent = line.startsWith("* ");
    const name = line.replace(/^\*?\s+/, "").split(/\s+/)[0];
    if (isCurrent) current = name;
    return {
      name,
      current: isCurrent,
    };
  });

  return { branches, current };
}

/** Parses custom-formatted `git show` output and `--numstat` diff into structured commit details. */
export function parseShow(stdout: string, diffStdout: string): GitShow {
  // stdout is the formatted commit info, diffStdout is the numstat
  const DELIMITER = "@@";
  const parts = stdout.trim().split(DELIMITER);
  const [hash, author, email, date, ...messageParts] = parts;
  const diff = parseDiffStat(diffStdout);

  return {
    hash,
    author,
    email,
    date,
    message: messageParts.join(DELIMITER),
    diff,
  };
}

/** Parses `git status --porcelain=v1` output after `git add` to extract the list and count of staged files. */
export function parseAdd(statusStdout: string): GitAdd {
  const lines = statusStdout.split("\n").filter(Boolean);
  const files: string[] = [];

  for (const line of lines) {
    const index = line[0];
    // Staged files have a non-space, non-? character in the index position
    if (index && index !== " " && index !== "?") {
      const file = line.slice(3).trim();
      // Handle renames: "old -> new"
      const parts = file.split(" -> ");
      files.push(parts[parts.length - 1]);
    }
  }

  return { staged: files.length, files };
}

/** Parses `git commit` output into structured commit data with hash, message, and change statistics. */
export function parseCommit(stdout: string): GitCommit {
  // Example output:
  // "[main abc1234] Fix the bug\n 1 file changed, 2 insertions(+), 1 deletion(-)"
  // "[main (root-commit) abc1234] Initial commit\n 1 file changed, 1 insertion(+)"
  const headerMatch = stdout.match(
    /\[[\w/.-]+\s+(?:\(root-commit\)\s+)?([a-f0-9]+)\]\s+(.+)/,
  );

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

/** Parses `git push` output into structured push result data. */
export function parsePush(
  stdout: string,
  stderr: string,
  remote: string,
  branch: string,
): GitPush {
  // Git push output goes to stderr typically
  const combined = `${stdout}\n${stderr}`.trim();

  // Extract branch from output if not provided
  // e.g., "To github.com:user/repo.git\n * [new branch]      main -> main"
  // or "   abc1234..def5678  main -> main"
  const branchMatch = combined.match(/(\S+)\s+->\s+(\S+)/);
  const resolvedBranch = branch || branchMatch?.[1] || "unknown";

  return {
    success: true,
    remote,
    branch: resolvedBranch,
    summary: combined || "Push completed successfully",
  };
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
  };
}

/** Parses `git checkout` output into structured checkout result data. */
export function parseCheckout(
  stdout: string,
  stderr: string,
  ref: string,
  previousRef: string,
  created: boolean,
): GitCheckout {
  return {
    ref,
    previousRef,
    created,
  };
}
