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
  // Format: hash|hashShort|author|date|refs|message
  const DELIMITER = "@@";
  const lines = stdout.trim().split("\n").filter(Boolean);
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
export function parseBranch(stdout: string): GitBranchFull {
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
  const [hash, author, date, ...messageParts] = parts;
  const diff = parseDiffStat(diffStdout);

  return {
    hash,
    hashShort: hash.slice(0, 7),
    author,
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
  const headerMatch = stdout.match(/\[[\w/.-]+\s+(?:\(root-commit\)\s+)?([a-f0-9]+)\]\s+(.+)/);

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
export function parsePush(stdout: string, stderr: string, remote: string, branch: string): GitPush {
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

/** Parses `git tag -l --sort=-creatordate --format='%(refname:short)\t%(creatordate:iso-strict)\t%(subject)'` output into structured tag data. */
export function parseTagOutput(stdout: string): GitTagFull {
  const lines = stdout.trim().split("\n").filter(Boolean);
  const tags = lines.map((line) => {
    const [name, date, ...messageParts] = line.split("\t");
    return {
      name: name || "",
      ...(date ? { date } : {}),
      ...(messageParts.join("\t") ? { message: messageParts.join("\t") } : {}),
    };
  });

  return { tags, total: tags.length };
}

/** Parses `git stash list --format='%gd\t%gs\t%ci'` output into structured stash list data. */
export function parseStashListOutput(stdout: string): GitStashListFull {
  const lines = stdout.trim().split("\n").filter(Boolean);
  const stashes = lines.map((line) => {
    const [ref, message, date] = line.split("\t");
    const indexMatch = ref?.match(/stash@\{(\d+)\}/);
    return {
      index: indexMatch ? parseInt(indexMatch[1], 10) : 0,
      message: message || "",
      date: date || "",
    };
  });

  return { stashes, total: stashes.length };
}

/** Parses `git stash push/pop/apply/drop` output into structured stash result data. */
export function parseStashOutput(
  stdout: string,
  stderr: string,
  action: "push" | "pop" | "apply" | "drop",
): GitStash {
  const combined = `${stdout}\n${stderr}`.trim();
  return {
    action,
    success: true,
    message: combined || `Stash ${action} completed successfully`,
  };
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
  }));

  return { remotes, total: remotes.length };
}

/** Parses `git blame --porcelain` output into structured blame data grouped by commit. */
export function parseBlameOutput(stdout: string, file: string): GitBlameFull {
  const rawLines = stdout.split("\n");

  let currentHash = "";
  let currentAuthor = "";
  let currentDate = "";
  let currentLineNumber = 0;
  let totalLines = 0;

  // Track commit info we've seen (porcelain only shows full info once per commit)
  const commitInfo = new Map<string, { author: string; date: string }>();

  // Build commit groups in encounter order (keyed by short hash)
  const commitOrder: string[] = [];
  const commitGroups = new Map<
    string,
    { author: string; date: string; lines: Array<{ lineNumber: number; content: string }> }
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
        commitInfo.set(currentHash, { author: currentAuthor, date: currentDate });
      }

      const shortHash = currentHash.slice(0, 8);
      let group = commitGroups.get(shortHash);
      if (!group) {
        group = { author: currentAuthor, date: currentDate, lines: [] };
        commitGroups.set(shortHash, group);
        commitOrder.push(shortHash);
      }
      group.lines.push({ lineNumber: currentLineNumber, content: line.slice(1) });
      totalLines++;

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

  return { commits, file, totalLines };
}

/** Parses `git restore` result into structured restore data.
 *  Since `git restore` produces no stdout on success, we return the file list that was passed in. */
export function parseRestore(files: string[], source: string, staged: boolean): GitRestore {
  return {
    restored: files,
    source,
    staged,
  };
}

/** Parses `git reset` output into structured reset data with the ref and list of unstaged files. */
export function parseReset(stdout: string, stderr: string, ref: string): GitReset {
  const combined = `${stdout}\n${stderr}`.trim();
  const unstaged: string[] = [];

  for (const line of combined.split("\n")) {
    const match = line.match(/^[A-Z]\t(.+)$/);
    if (match) {
      unstaged.push(match[1]);
    }
  }

  return { ref, unstaged };
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

  if (exitCode !== 0 && conflicts.length > 0) {
    return {
      success: false,
      applied: [],
      conflicts,
    };
  }

  if (/cherry-pick.*abort/i.test(combined) || /abort/i.test(combined)) {
    if (exitCode === 0) {
      return {
        success: true,
        applied: [],
        conflicts: [],
      };
    }
  }

  if (exitCode === 0) {
    return {
      success: true,
      applied: commits,
      conflicts: [],
    };
  }

  return {
    success: false,
    applied: [],
    conflicts,
  };
}

/** Parses `git merge` output into structured merge result data with conflict detection. */
export function parseMerge(stdout: string, stderr: string, branch: string): GitMerge {
  const combined = `${stdout}\n${stderr}`.trim();

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
      fastForward: false,
      branch,
      conflicts: mergeConflicts,
    };
  }

  // Detect fast-forward
  const fastForward = /Fast-forward|fast-forward/i.test(combined);

  // Extract merge commit hash from output
  const hashMatch = combined.match(/([a-f0-9]{7,40})\.\.[a-f0-9]{7,40}/);
  const commitHash = hashMatch ? hashMatch[0].split("..")[1] : undefined;

  return {
    merged: true,
    fastForward,
    branch,
    conflicts: [],
    ...(commitHash ? { commitHash } : {}),
  };
}

/** Parses `git merge --abort` output into structured merge result data. */
export function parseMergeAbort(_stdout: string, _stderr: string): GitMerge {
  return {
    merged: false,
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

  if (!branch && conflicts.length === 0) {
    return {
      success: true,
      branch: "",
      current,
      conflicts: [],
    };
  }

  if (/Successfully rebased/.test(combined) && conflicts.length === 0) {
    return {
      success: true,
      branch,
      current,
      conflicts: [],
      ...(rebasedCommits !== undefined ? { rebasedCommits } : {}),
    };
  }

  return {
    success: conflicts.length === 0,
    branch,
    current,
    conflicts,
    ...(rebasedCommits !== undefined ? { rebasedCommits } : {}),
  };
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
    const commitMatch = line.match(/^([|/\\\s*_.-]+?)\s([a-f0-9]{7,12})\s(.+)$/);
    if (commitMatch) {
      const graph = commitMatch[1];
      const hashShort = commitMatch[2];
      let rest = commitMatch[3];

      // Extract refs from decoration: (HEAD -> main, origin/main, tag: v1.0)
      let refs: string | undefined;
      const refsMatch = rest.match(/^\(([^)]+)\)\s*/);
      if (refsMatch) {
        refs = refsMatch[1];
        rest = rest.slice(refsMatch[0].length);
      }

      commits.push({
        graph,
        hashShort,
        message: rest,
        ...(refs ? { refs } : {}),
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

  // Count only actual commits (non-empty hashShort)
  const total = commits.filter((c) => c.hashShort !== "").length;
  return { commits, total };
}

/** Parses custom-formatted `git reflog` output (tab-delimited: %H\t%h\t%gd\t%gs\t%ci) into structured reflog entries. */
export function parseReflogOutput(stdout: string): GitReflogFull {
  const lines = stdout.trim().split("\n").filter(Boolean);
  const entries = lines.map((line) => {
    const [hash, shortHash, selector, subject, date] = line.split("\t");
    // Split subject into action and description: "checkout: moving from main to feature"
    const colonIdx = (subject || "").indexOf(": ");
    const action = colonIdx >= 0 ? (subject || "").slice(0, colonIdx) : subject || "";
    const description = colonIdx >= 0 ? (subject || "").slice(colonIdx + 2) : "";

    return {
      hash: hash || "",
      shortHash: shortHash || "",
      selector: selector || "",
      action,
      description,
      date: date || "",
    };
  });

  return { entries, total: entries.length };
}
