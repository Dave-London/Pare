import type { GitStatus, GitLog, GitDiff, GitBranch, GitShow } from "../schemas/index.js";

const STATUS_MAP: Record<string, GitStatus["staged"][number]["status"]> = {
  A: "added",
  M: "modified",
  D: "deleted",
  R: "renamed",
  C: "copied",
};

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

export function parseLog(stdout: string): GitLog {
  // Format: hash|hashShort|author|email|date|refs|message
  const DELIMITER = "\x1f";
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

export function parseShow(stdout: string, diffStdout: string): GitShow {
  // stdout is the formatted commit info, diffStdout is the numstat
  const DELIMITER = "\x1f";
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
