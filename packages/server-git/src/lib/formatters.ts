import type {
  GitStatus,
  GitLog,
  GitDiff,
  GitBranchFull,
  GitShow,
  GitAdd,
  GitCommit,
  GitPush,
  GitPull,
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
} from "../schemas/index.js";

/** Formats structured git status data into a human-readable summary string. */
export function formatStatus(s: GitStatus): string {
  if (s.clean) return `On branch ${s.branch} — clean`;

  const parts = [`On branch ${s.branch}`];
  if (s.upstream) {
    const tracking = [];
    if (s.ahead) tracking.push(`ahead ${s.ahead}`);
    if (s.behind) tracking.push(`behind ${s.behind}`);
    if (tracking.length) parts[0] += ` [${tracking.join(", ")}]`;
  }
  if (s.staged.length)
    parts.push(`Staged: ${s.staged.map((f) => `${f.status[0]}:${f.file}`).join(", ")}`);
  if (s.modified.length) parts.push(`Modified: ${s.modified.join(", ")}`);
  if (s.deleted.length) parts.push(`Deleted: ${s.deleted.join(", ")}`);
  if (s.untracked.length) parts.push(`Untracked: ${s.untracked.join(", ")}`);
  if (s.conflicts.length) parts.push(`Conflicts: ${s.conflicts.join(", ")}`);

  return parts.join("\n");
}

/** Formats structured git log data into a human-readable list of commits. */
export function formatLog(log: GitLog): string {
  return log.commits.map((c) => `${c.hashShort} ${c.message} (${c.author}, ${c.date})`).join("\n");
}

/** Formats structured git diff statistics into a human-readable file change summary. */
export function formatDiff(diff: GitDiff): string {
  const files = diff.files.map((f) => `  ${f.file} +${f.additions} -${f.deletions}`).join("\n");
  return `${diff.totalFiles} files changed, +${diff.totalAdditions ?? 0} -${diff.totalDeletions ?? 0}\n${files}`;
}

/** Formats structured git branch data into a human-readable branch listing. */
export function formatBranch(b: GitBranchFull): string {
  return b.branches.map((br) => `${br.current ? "* " : "  "}${br.name}`).join("\n");
}

/** Formats structured git show data into a human-readable commit detail view with diff summary. */
export function formatShow(s: GitShow): string {
  const header = `${(s.hash ?? "").slice(0, 8)} ${s.message}\nAuthor: ${s.author ?? ""}\nDate: ${s.date ?? ""}`;
  const diff = s.diff ? formatDiff(s.diff) : "";
  return diff ? `${header}\n\n${diff}` : header;
}

/** Formats structured git add data into a human-readable summary of staged files. */
export function formatAdd(a: GitAdd): string {
  if (a.staged === 0) return "No files staged";
  return `Staged ${a.staged} file(s): ${a.files.join(", ")}`;
}

/** Formats structured git commit data into a human-readable commit summary. */
export function formatCommit(c: GitCommit): string {
  const stats = [`${c.filesChanged} file(s) changed`, `+${c.insertions}`, `-${c.deletions}`].join(
    ", ",
  );
  return `[${c.hashShort}] ${c.message}\n${stats}`;
}

/** Formats structured git push data into a human-readable push summary. */
export function formatPush(p: GitPush): string {
  const created = p.created ? " [new branch]" : "";
  return `Pushed to ${p.remote}/${p.branch}${created}: ${p.summary}`;
}

/** Formats structured git pull data into a human-readable pull summary. */
export function formatPull(p: GitPull): string {
  const parts = [p.summary];
  if (p.filesChanged > 0) {
    parts.push(`${p.filesChanged} file(s) changed, +${p.insertions} -${p.deletions}`);
  }
  if (p.conflicts.length > 0) {
    parts.push(`Conflicts: ${p.conflicts.join(", ")}`);
  }
  if (p.upToDate) {
    parts.push("(up to date)");
  }
  if (p.fastForward) {
    parts.push("(fast-forward)");
  }
  return parts.join("\n");
}

/** Formats structured git checkout data into a human-readable checkout summary. */
export function formatCheckout(c: GitCheckout): string {
  if (c.detached) {
    return `HEAD is now detached at '${c.ref}' (was ${c.previousRef})`;
  }
  if (c.created) {
    return `Created and switched to new branch '${c.ref}' (was ${c.previousRef})`;
  }
  return `Switched to '${c.ref}' (was ${c.previousRef})`;
}

/** Formats structured git restore data into a human-readable restore summary. */
export function formatRestore(r: GitRestore): string {
  if (r.restored.length === 0) return "No files restored";
  const mode = r.staged ? "staged" : "working tree";
  const src = r.source !== "HEAD" ? ` from ${r.source}` : "";
  return `Restored ${r.restored.length} file(s) (${mode})${src}: ${r.restored.join(", ")}`;
}

/** Formats structured git reset data into a human-readable reset summary. */
export function formatReset(r: GitReset): string {
  const modeStr = r.mode ? ` (${r.mode})` : "";
  if (r.filesAffected.length === 0) return `Reset to ${r.ref}${modeStr} — no files affected`;
  return `Reset to ${r.ref}${modeStr}: ${r.filesAffected.length} file(s) affected: ${r.filesAffected.join(", ")}`;
}

// ── Compact types, mappers, and formatters ───────────────────────────

/** Compact log: only hashShort + message, with refs when present. */
export interface GitLogCompact {
  [key: string]: unknown;
  commits: Array<{ hashShort: string; message: string; refs?: string }>;
  total: number;
}

export function compactLogMap(log: GitLog): GitLogCompact {
  return {
    commits: log.commits.map((c) => ({
      hashShort: c.hashShort,
      message: c.message,
      ...(c.refs ? { refs: c.refs } : {}),
    })),
    total: log.total,
  };
}

export function formatLogCompact(log: GitLogCompact): string {
  return log.commits
    .map((c) => `${c.hashShort} ${c.message}${c.refs ? ` (${c.refs})` : ""}`)
    .join("\n");
}

/** Compact diff: file-level stats only, no chunks or aggregate totals. */
export interface GitDiffCompact {
  [key: string]: unknown;
  files: Array<{
    file: string;
    status: "added" | "modified" | "deleted" | "renamed" | "copied";
    additions: number;
    deletions: number;
  }>;
  totalFiles: number;
}

export function compactDiffMap(diff: GitDiff): GitDiffCompact {
  return {
    files: diff.files.map((f) => ({
      file: f.file,
      status: f.status,
      additions: f.additions,
      deletions: f.deletions,
    })),
    totalFiles: diff.totalFiles,
  };
}

export function formatDiffCompact(diff: GitDiffCompact): string {
  const files = diff.files.map((f) => `  ${f.file} +${f.additions} -${f.deletions}`).join("\n");
  return `${diff.totalFiles} files changed\n${files}`;
}

/** Compact branch: just branch names as string array + current. */
export interface GitBranchCompact {
  [key: string]: unknown;
  branches: string[];
  current: string;
}

export function compactBranchMap(b: GitBranchFull): GitBranchCompact {
  return {
    branches: b.branches.map((br) => br.name),
    current: b.current,
  };
}

export function formatBranchCompact(b: GitBranchCompact): string {
  return b.branches.map((name) => `${name === b.current ? "* " : "  "}${name}`).join("\n");
}

/** Compact show: hashShort + message + author + date, no diff. */
export interface GitShowCompact {
  [key: string]: unknown;
  hashShort: string;
  message: string;
  author?: string;
  date?: string;
}

export function compactShowMap(s: GitShow): GitShowCompact {
  return {
    hashShort: s.hashShort ?? (s.hash ?? "").slice(0, 7),
    message: s.message.split("\n")[0],
    ...(s.author ? { author: s.author } : {}),
    ...(s.date ? { date: s.date } : {}),
  };
}

export function formatShowCompact(s: GitShowCompact): string {
  const parts = [`${s.hashShort} ${s.message}`];
  if (s.author) parts.push(`Author: ${s.author}`);
  if (s.date) parts.push(`Date: ${s.date}`);
  return parts.join("\n");
}

// ── Tag formatters ───────────────────────────────────────────────────

/** Formats structured git tag data into a human-readable tag listing. */
export function formatTag(t: GitTagFull): string {
  if (t.tags.length === 0) return "No tags found";
  return t.tags
    .map((tag) => {
      const parts = [tag.name];
      if (tag.date) parts.push(tag.date);
      if (tag.message) parts.push(tag.message);
      return parts.join("  ");
    })
    .join("\n");
}

/** Compact tag: just tag names as string array + total. */
export interface GitTagCompact {
  [key: string]: unknown;
  tags: string[];
  total: number;
}

export function compactTagMap(t: GitTagFull): GitTagCompact {
  return {
    tags: t.tags.map((tag) => tag.name),
    total: t.total,
  };
}

export function formatTagCompact(t: GitTagCompact): string {
  if (t.tags.length === 0) return "No tags found";
  return t.tags.join("\n");
}

// ── Stash list formatters ────────────────────────────────────────────

/** Formats structured git stash list data into a human-readable stash listing. */
export function formatStashList(s: GitStashListFull): string {
  if (s.stashes.length === 0) return "No stashes found";
  return s.stashes
    .map((st) => {
      const branch = st.branch ? ` [${st.branch}]` : "";
      return `stash@{${st.index}}: ${st.message}${branch} (${st.date})`;
    })
    .join("\n");
}

/** Compact stash list: just index + message as string array + total. */
export interface GitStashListCompact {
  [key: string]: unknown;
  stashes: string[];
  total: number;
}

export function compactStashListMap(s: GitStashListFull): GitStashListCompact {
  return {
    stashes: s.stashes.map((st) => `stash@{${st.index}}: ${st.message}`),
    total: s.total,
  };
}

export function formatStashListCompact(s: GitStashListCompact): string {
  if (s.stashes.length === 0) return "No stashes found";
  return s.stashes.join("\n");
}

// ── Stash formatters ─────────────────────────────────────────────────

/** Formats structured git stash result into a human-readable summary. */
export function formatStash(s: GitStash): string {
  const ref = s.stashRef ? ` (${s.stashRef})` : "";
  return `${s.message}${ref}`;
}

// ── Remote formatters ────────────────────────────────────────────────

/** Formats structured git remote data into a human-readable remote listing. */
export function formatRemote(r: GitRemoteFull): string {
  if (r.remotes.length === 0) return "No remotes configured";
  return r.remotes
    .map((remote) => {
      const proto = remote.protocol ? ` [${remote.protocol}]` : "";
      return `${remote.name}\t${remote.fetchUrl} (fetch)${proto}\n${remote.name}\t${remote.pushUrl} (push)`;
    })
    .join("\n");
}

/** Compact remote: just name as string array + total. */
export interface GitRemoteCompact {
  [key: string]: unknown;
  remotes: string[];
  total: number;
}

export function compactRemoteMap(r: GitRemoteFull): GitRemoteCompact {
  return {
    remotes: r.remotes.map((remote) => remote.name),
    total: r.total,
  };
}

export function formatRemoteCompact(r: GitRemoteCompact): string {
  if (r.remotes.length === 0) return "No remotes configured";
  return r.remotes.join("\n");
}

// ── Blame formatters ─────────────────────────────────────────────────

/** Formats structured git blame data into a human-readable annotated file view. */
export function formatBlame(b: GitBlameFull): string {
  if (b.totalLines === 0) return `No blame data for ${b.file}`;
  // Flatten to per-line for human-readable output, sorted by line number
  const flat: Array<{
    hash: string;
    author: string;
    date: string;
    lineNumber: number;
    content: string;
  }> = [];
  for (const c of b.commits) {
    for (const l of c.lines) {
      flat.push({ hash: c.hash, author: c.author, date: c.date, ...l });
    }
  }
  flat.sort((a, b) => a.lineNumber - b.lineNumber);
  return flat
    .map((l) => `${l.hash} (${l.author} ${l.date}) ${l.lineNumber}: ${l.content}`)
    .join("\n");
}

/** Compact blame: hash + line numbers only, no author/date/content. */
export interface GitBlameCompact {
  [key: string]: unknown;
  commits: Array<{ hash: string; lines: number[] }>;
  file: string;
  totalLines: number;
}

export function compactBlameMap(b: GitBlameFull): GitBlameCompact {
  return {
    commits: b.commits.map((c) => ({
      hash: c.hash,
      lines: c.lines.map((l) => l.lineNumber),
    })),
    file: b.file,
    totalLines: b.totalLines,
  };
}

/** Compresses sorted line numbers into range strings (e.g., [1,2,3,7,9,10] → "1-3, 7, 9-10"). */
function compressLineRanges(nums: number[]): string {
  if (nums.length === 0) return "";
  const sorted = [...nums].sort((a, b) => a - b);
  const ranges: string[] = [];
  let start = sorted[0];
  let end = sorted[0];
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i] === end + 1) {
      end = sorted[i];
    } else {
      ranges.push(start === end ? `${start}` : `${start}-${end}`);
      start = sorted[i];
      end = sorted[i];
    }
  }
  ranges.push(start === end ? `${start}` : `${start}-${end}`);
  return ranges.join(", ");
}

export function formatBlameCompact(b: GitBlameCompact): string {
  if (b.totalLines === 0) return `No blame data for ${b.file}`;
  return b.commits.map((c) => `${c.hash}: lines ${compressLineRanges(c.lines)}`).join("\n");
}

// ── Cherry-pick formatters ───────────────────────────────────────────

/** Formats structured git cherry-pick data into a human-readable summary. */
export function formatCherryPick(cp: GitCherryPick): string {
  if (!cp.success && cp.conflicts.length > 0) {
    return `Cherry-pick paused due to conflicts:\n${cp.conflicts.map((f) => `  CONFLICT: ${f}`).join("\n")}`;
  }
  if (!cp.success) {
    return "Cherry-pick failed";
  }
  if (cp.applied.length === 0) {
    return "Cherry-pick completed (no commits applied)";
  }
  const hashPart = cp.newCommitHash ? ` -> ${cp.newCommitHash}` : "";
  return `Cherry-pick applied ${cp.applied.length} commit(s): ${cp.applied.join(", ")}${hashPart}`;
}

// ── Rebase formatters ─────────────────────────────────────────────────

/** Formats structured git rebase data into a human-readable rebase summary. */
export function formatRebase(r: GitRebase): string {
  if (!r.success) {
    const parts = [`Rebase of '${r.current}' onto '${r.branch}' paused with conflicts`];
    if (r.conflicts.length > 0) {
      parts.push(`Conflicts: ${r.conflicts.join(", ")}`);
    }
    return parts.join("\n");
  }

  if (!r.branch) {
    return `Rebase aborted on '${r.current}'`;
  }

  const parts = [`Rebased '${r.current}' onto '${r.branch}'`];
  if (r.rebasedCommits !== undefined) {
    parts.push(`${r.rebasedCommits} commit(s) rebased`);
  }
  return parts.join("\n");
}

// ── Merge formatters ──────────────────────────────────────────────────

/** Formats structured git merge data into a human-readable merge summary. */
export function formatMerge(m: GitMerge): string {
  if (!m.merged && m.conflicts.length > 0) {
    return `Merge of '${m.branch}' failed with ${m.conflicts.length} conflict(s): ${m.conflicts.join(", ")}`;
  }

  if (!m.merged && m.branch === "") {
    return "Merge aborted";
  }

  const parts: string[] = [];
  if (m.fastForward) {
    parts.push(`Fast-forward merge of '${m.branch}'`);
  } else {
    parts.push(`Merged '${m.branch}'`);
  }
  if (m.commitHash) {
    parts.push(`(${m.commitHash})`);
  }
  return parts.join(" ");
}

// ── Log-graph formatters ──────────────────────────────────────────────

/** Formats structured git log-graph data into a human-readable graph view. */
export function formatLogGraph(lg: GitLogGraphFull): string {
  if (lg.total === 0) return "No commits found";
  return lg.commits
    .map((c) => {
      if (c.hashShort === "") return c.graph;
      const refs = c.refs ? ` (${c.refs})` : "";
      const merge = c.isMerge ? " [merge]" : "";
      return `${c.graph} ${c.hashShort} ${c.message}${refs}${merge}`;
    })
    .join("\n");
}

/** Compact log-graph: drops pure graph continuation lines, keeps only commit entries. */
export interface GitLogGraphCompact {
  [key: string]: unknown;
  commits: Array<{ g: string; h: string; m: string; r?: string }>;
  total: number;
}

export function compactLogGraphMap(lg: GitLogGraphFull): GitLogGraphCompact {
  return {
    commits: lg.commits
      .filter((c) => c.hashShort !== "")
      .map((c) => ({
        g: c.graph,
        h: c.hashShort,
        m: c.message,
        ...(c.refs ? { r: c.refs } : {}),
      })),
    total: lg.total,
  };
}

export function formatLogGraphCompact(lg: GitLogGraphCompact): string {
  if (lg.total === 0) return "No commits found";
  return lg.commits.map((c) => `${c.g} ${c.h} ${c.m}${c.r ? ` (${c.r})` : ""}`).join("\n");
}

// ── Reflog formatters ─────────────────────────────────────────────────

/** Formats structured git reflog data into a human-readable reflog listing. */
export function formatReflog(r: GitReflogFull): string {
  if (r.entries.length === 0) return "No reflog entries found";
  return r.entries
    .map((e) => {
      const desc = e.description ? `: ${e.description}` : "";
      return `${e.shortHash} ${e.selector} ${e.action}${desc} (${e.date})`;
    })
    .join("\n");
}

/** Compact reflog: selector + action + description as string array + total. */
export interface GitReflogCompact {
  [key: string]: unknown;
  entries: string[];
  total: number;
}

export function compactReflogMap(r: GitReflogFull): GitReflogCompact {
  return {
    entries: r.entries.map((e) => {
      const desc = e.description ? `: ${e.description}` : "";
      return `${e.shortHash} ${e.selector} ${e.action}${desc}`;
    }),
    total: r.total,
  };
}

export function formatReflogCompact(r: GitReflogCompact): string {
  if (r.entries.length === 0) return "No reflog entries found";
  return r.entries.join("\n");
}

// ── Bisect formatters ─────────────────────────────────────────────────

/** Formats structured git bisect data into a human-readable bisect summary. */
export function formatBisect(b: GitBisect): string {
  if (b.result) {
    const parts = [`Bisect found culprit: ${b.result.hash.slice(0, 8)} ${b.result.message}`];
    if (b.result.author) parts.push(`Author: ${b.result.author}`);
    if (b.result.date) parts.push(`Date: ${b.result.date}`);
    return parts.join("\n");
  }

  const parts = [`Bisect ${b.action}`];
  if (b.current) parts.push(`Current: ${b.current}`);
  if (b.remaining !== undefined) parts.push(`~${b.remaining} step(s) remaining`);
  return parts.join(" — ");
}

// ── Worktree formatters ────────────────────────────────────────────────

/** Formats structured git worktree list data into a human-readable worktree listing. */
export function formatWorktreeList(w: GitWorktreeListFull): string {
  if (w.worktrees.length === 0) return "No worktrees found";
  return w.worktrees
    .map((wt) => {
      const bare = wt.bare ? " [bare]" : "";
      const branch = wt.branch ? ` (${wt.branch})` : "";
      return `${wt.path}  ${wt.head.slice(0, 8)}${branch}${bare}`;
    })
    .join("\n");
}

/** Compact worktree list: path + branch as string array + total. */
export interface GitWorktreeListCompact {
  [key: string]: unknown;
  worktrees: string[];
  total: number;
}

export function compactWorktreeListMap(w: GitWorktreeListFull): GitWorktreeListCompact {
  return {
    worktrees: w.worktrees.map((wt) => {
      const branch = wt.branch ? ` (${wt.branch})` : "";
      return `${wt.path}${branch}`;
    }),
    total: w.total,
  };
}

export function formatWorktreeListCompact(w: GitWorktreeListCompact): string {
  if (w.worktrees.length === 0) return "No worktrees found";
  return w.worktrees.join("\n");
}

/** Formats structured git worktree add/remove result into a human-readable summary. */
export function formatWorktree(w: GitWorktree): string {
  const branch = w.branch ? ` on branch '${w.branch}'` : "";
  const head = w.head ? ` at ${w.head}` : "";
  return `Worktree at '${w.path}'${branch}${head}`;
}
