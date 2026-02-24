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
  GitRemoteMutate,
  GitTagMutate,
  GitWorktreeListFull,
  GitWorktree,
  GitSubmodule,
  GitArchive,
  GitClean,
  GitConfig,
} from "../schemas/index.js";

/** Formats structured git status data into a human-readable summary string. */
export function formatStatus(s: GitStatus): string {
  if (s.clean) return `On branch ${s.branch} — clean`;

  const version = s.porcelainVersion ? ` [${s.porcelainVersion}]` : "";
  const parts = [`On branch ${s.branch}${version}`];
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
  const totalFiles = diff.files.length;
  const totalAdditions = diff.files.reduce((s, f) => s + f.additions, 0);
  const totalDeletions = diff.files.reduce((s, f) => s + f.deletions, 0);
  const files = diff.files.map((f) => `  ${f.file} +${f.additions} -${f.deletions}`).join("\n");
  return `${totalFiles} files changed, +${totalAdditions} -${totalDeletions}\n${files}`;
}

/** Formats structured git branch data into a human-readable branch listing. */
export function formatBranch(b: GitBranchFull): string {
  return b.branches
    .map((br) => {
      const prefix = br.current ? "* " : "  ";
      const upstream = br.upstream ? ` -> ${br.upstream}` : "";
      return `${prefix}${br.name}${upstream}`;
    })
    .join("\n");
}

/** Formats structured git show data into a human-readable commit detail view with diff summary. */
export function formatShow(s: GitShow): string {
  if (s.objectType && s.objectType !== "commit") {
    const size = s.objectSize !== undefined ? ` (${s.objectSize} bytes)` : "";
    const name = s.objectName ? ` ${s.objectName}` : "";
    return `${s.objectType}${name}${size}\n${s.message}`;
  }
  const header = `${(s.hash ?? "").slice(0, 8)} ${s.message}\nAuthor: ${s.author ?? ""}\nDate: ${s.date ?? ""}`;
  const diff = s.diff ? formatDiff(s.diff) : "";
  return diff ? `${header}\n\n${diff}` : header;
}

/** Formats structured git add data into a human-readable summary of staged files. */
export function formatAdd(a: GitAdd): string {
  const staged = a.files.length;
  if (staged === 0) return "No files staged";
  return `Staged ${staged} file(s): ${a.files.map((f) => `${f.status[0]}:${f.file}`).join(", ")}`;
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
  if (!p.success) {
    const parts = ["Push failed"];
    if (p.errorType) parts.push(`[${p.errorType}]`);
    if (p.rejectedRef) parts.push(`rejected ref: ${p.rejectedRef}`);
    if (p.hint) parts.push(`hint: ${p.hint}`);
    parts.push(p.summary);
    if (p.objectStats) {
      const stats = [
        p.objectStats.total != null ? `total=${p.objectStats.total}` : undefined,
        p.objectStats.delta != null ? `delta=${p.objectStats.delta}` : undefined,
        p.objectStats.reused != null ? `reused=${p.objectStats.reused}` : undefined,
        p.objectStats.packReused != null ? `packReused=${p.objectStats.packReused}` : undefined,
      ]
        .filter(Boolean)
        .join(", ");
      if (stats) parts.push(`objects: ${stats}`);
    }
    return parts.join("\n");
  }
  const created = p.created ? " [new branch]" : "";
  const stats =
    p.objectStats && p.objectStats.total != null
      ? ` (objects=${p.objectStats.total}${p.objectStats.delta != null ? `, delta=${p.objectStats.delta}` : ""})`
      : "";
  return `Push completed${created}${stats}: ${p.summary}`;
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
  if (p.changedFiles && p.changedFiles.length > 0) {
    parts.push(`Changed: ${p.changedFiles.map((f) => f.file).join(", ")}`);
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
  if (!c.success) {
    const parts = [`Checkout failed: ${c.errorType || "unknown"}`];
    if (c.errorMessage) parts.push(c.errorMessage);
    if (c.conflictFiles && c.conflictFiles.length > 0) {
      parts.push(`Conflicting files: ${c.conflictFiles.join(", ")}`);
    }
    return parts.join("\n");
  }
  if (c.detached) {
    return `HEAD is now detached (was ${c.previousRef})`;
  }
  if (c.created) {
    return `Created and switched to new branch (was ${c.previousRef})`;
  }
  const modified =
    c.modifiedFiles && c.modifiedFiles.length > 0
      ? ` [${c.modifiedFiles.length} files changed]`
      : "";
  return `Checkout completed (was ${c.previousRef})${modified}`;
}

/** Formats structured git restore data into a human-readable restore summary. */
export function formatRestore(r: GitRestore): string {
  if (r.success === false) {
    return `Restore failed${r.errorType ? ` [${r.errorType}]` : ""}: ${r.errorMessage || "unknown error"}`;
  }
  if (r.restored.length === 0) return "No files restored";
  const mode = r.staged ? "staged" : "working tree";
  const src = r.source !== "HEAD" ? ` from ${r.source}` : "";
  const verified =
    r.verified !== undefined ? (r.verified ? " [verified]" : " [verification failed]") : "";
  return `Restored ${r.restored.length} file(s) (${mode})${src}${verified}: ${r.restored.join(", ")}`;
}

/** Formats structured git reset data into a human-readable reset summary. */
export function formatReset(r: GitReset): string {
  if (r.success === false) {
    return `Reset failed${r.errorType ? ` [${r.errorType}]` : ""}: ${r.errorMessage || "unknown error"}`;
  }
  const modeStr = r.mode ? ` (${r.mode})` : "";
  const refInfo =
    r.previousRef && r.newRef ? ` [${r.previousRef.slice(0, 7)}..${r.newRef.slice(0, 7)}]` : "";
  if (r.filesAffected.length === 0)
    return `Reset to ${r.ref}${modeStr}${refInfo} — no files affected`;
  return `Reset to ${r.ref}${modeStr}${refInfo}: ${r.filesAffected.length} file(s) affected: ${r.filesAffected.join(", ")}`;
}

// ── Compact types, mappers, and formatters ───────────────────────────

/** Compact log: only hashShort + message, with refs when present. */
export interface GitLogCompact {
  [key: string]: unknown;
  commits: Array<{ hashShort: string; message: string; refs?: string }>;
}

export function compactLogMap(log: GitLog): GitLogCompact {
  return {
    commits: log.commits.map((c) => ({
      hashShort: c.hashShort,
      message: c.message,
      ...(c.refs ? { refs: c.refs } : {}),
    })),
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
}

export function compactDiffMap(diff: GitDiff): GitDiffCompact {
  return {
    files: diff.files.map((f) => ({
      file: f.file,
      status: f.status,
      additions: f.additions,
      deletions: f.deletions,
    })),
  };
}

export function formatDiffCompact(diff: GitDiffCompact): string {
  const totalFiles = diff.files.length;
  const files = diff.files.map((f) => `  ${f.file} +${f.additions} -${f.deletions}`).join("\n");
  return `${totalFiles} files changed\n${files}`;
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
      if (tag.tagType) parts.push(`[${tag.tagType}]`);
      if (tag.date) parts.push(tag.date);
      if (tag.message) parts.push(tag.message);
      return parts.join("  ");
    })
    .join("\n");
}

/** Compact tag: just tag names as string array. */
export interface GitTagCompact {
  [key: string]: unknown;
  tags: string[];
}

export function compactTagMap(t: GitTagFull): GitTagCompact {
  return {
    tags: t.tags.map((tag) => tag.name),
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
      const fileInfo = st.files !== undefined ? ` (${st.files} file(s))` : "";
      const summaryInfo = st.summary ? ` — ${st.summary}` : "";
      return `stash@{${st.index}}: ${st.message}${branch} (${st.date})${fileInfo}${summaryInfo}`;
    })
    .join("\n");
}

/** Compact stash list: just index + message as string array. */
export interface GitStashListCompact {
  [key: string]: unknown;
  stashes: string[];
}

export function compactStashListMap(s: GitStashListFull): GitStashListCompact {
  return {
    stashes: s.stashes.map((st) => `stash@{${st.index}}: ${st.message}`),
  };
}

export function formatStashListCompact(s: GitStashListCompact): string {
  if (s.stashes.length === 0) return "No stashes found";
  return s.stashes.join("\n");
}

// ── Stash formatters ─────────────────────────────────────────────────

/** Formats structured git stash result into a human-readable summary. */
export function formatStash(s: GitStash): string {
  if (!s.success) {
    const parts = ["Stash operation failed"];
    if (s.reason) parts.push(`[${s.reason}]`);
    if (s.conflictFiles && s.conflictFiles.length > 0) {
      parts.push(`Conflicting files: ${s.conflictFiles.join(", ")}`);
    }
    parts.push(s.message);
    return parts.join("\n");
  }

  if (s.diffStat) {
    const parts = [
      `${s.diffStat.filesChanged} file(s) changed, +${s.diffStat.insertions} -${s.diffStat.deletions}`,
    ];
    if (s.diffStat.files && s.diffStat.files.length > 0) {
      for (const f of s.diffStat.files) {
        parts.push(`  ${f.file} +${f.insertions ?? 0} -${f.deletions ?? 0}`);
      }
    }
    return parts.join("\n");
  }

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
      const tracked =
        remote.trackedBranches && remote.trackedBranches.length > 0
          ? `\n  tracked: ${remote.trackedBranches.join(", ")}`
          : "";
      return `${remote.name}\t${remote.fetchUrl} (fetch)${proto}\n${remote.name}\t${remote.pushUrl} (push)${tracked}`;
    })
    .join("\n");
}

/** Compact remote: just name as string array. */
export interface GitRemoteCompact {
  [key: string]: unknown;
  remotes: string[];
}

export function compactRemoteMap(r: GitRemoteFull): GitRemoteCompact {
  return {
    remotes: r.remotes.map((remote) => remote.name),
  };
}

export function formatRemoteCompact(r: GitRemoteCompact): string {
  if (r.remotes.length === 0) return "No remotes configured";
  return r.remotes.join("\n");
}

// ── Blame formatters ─────────────────────────────────────────────────

/** Formats structured git blame data into a human-readable annotated file view. */
export function formatBlame(b: GitBlameFull): string {
  const totalLines = b.commits.reduce((s, c) => s + c.lines.length, 0);
  if (totalLines === 0) return `No blame data for ${b.file}`;
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
    .map((l) => `${l.hash.slice(0, 8)} (${l.author} ${l.date}) ${l.lineNumber}: ${l.content}`)
    .join("\n");
}

/** Compact blame: hash + line numbers only, no author/date/content. */
export interface GitBlameCompact {
  [key: string]: unknown;
  commits: Array<{ hash: string; lines: number[] }>;
  file: string;
}

export function compactBlameMap(b: GitBlameFull): GitBlameCompact {
  return {
    commits: b.commits.map((c) => ({
      hash: c.hash,
      lines: c.lines.map((l) => l.lineNumber),
    })),
    file: b.file,
  };
}

/** Compresses sorted line numbers into range strings (e.g., [1,2,3,7,9,10] -> "1-3, 7, 9-10"). */
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
  const totalLines = b.commits.reduce((s, c) => s + c.lines.length, 0);
  if (totalLines === 0) return `No blame data for ${b.file}`;
  return b.commits.map((c) => `${c.hash}: lines ${compressLineRanges(c.lines)}`).join("\n");
}

// ── Cherry-pick formatters ───────────────────────────────────────────

/** Formats structured git cherry-pick data into a human-readable summary. */
export function formatCherryPick(cp: GitCherryPick): string {
  if (cp.state === "conflict") {
    return `Cherry-pick paused due to conflicts [${cp.state}]:\n${cp.conflicts.map((f) => `  CONFLICT: ${f}`).join("\n")}`;
  }
  if (!cp.success) {
    return `Cherry-pick failed [${cp.state}]`;
  }
  if (cp.applied.length === 0) {
    return `Cherry-pick completed [${cp.state}] (no commits applied)`;
  }
  const hashPart = cp.newCommitHash ? ` -> ${cp.newCommitHash}` : "";
  return `Cherry-pick applied ${cp.applied.length} commit(s) [${cp.state}]: ${cp.applied.join(", ")}${hashPart}`;
}

// ── Rebase formatters ─────────────────────────────────────────────────

/** Formats structured git rebase data into a human-readable rebase summary. */
export function formatRebase(r: GitRebase): string {
  if (r.state === "conflict") {
    const parts = [
      `Rebase of '${r.current}' onto '${r.branch}' paused with conflicts [${r.state}]`,
    ];
    if (r.conflicts.length > 0) {
      parts.push(`Conflicts: ${r.conflicts.join(", ")}`);
    }
    return parts.join("\n");
  }

  if (!r.branch) {
    return `Rebase aborted on '${r.current}'`;
  }

  const parts = [`Rebased '${r.current}' onto '${r.branch}' [${r.state}]`];
  if (r.rebasedCommits !== undefined) {
    parts.push(`${r.rebasedCommits} commit(s) rebased`);
  }
  if (r.verified !== undefined) {
    parts.push(
      r.verified
        ? "verification: ok"
        : `verification: failed (${r.verificationError || "unknown"})`,
    );
  }
  return parts.join("\n");
}

// ── Merge formatters ──────────────────────────────────────────────────

/** Formats structured git merge data into a human-readable merge summary. */
export function formatMerge(m: GitMerge): string {
  if (!m.merged && m.state === "failed") {
    return `Merge failed${m.errorType ? ` [${m.errorType}]` : ""}: ${m.errorMessage || "unknown error"}`;
  }
  if (m.state === "conflict") {
    return `Merge of '${m.branch}' failed with ${m.conflicts.length} conflict(s) [${m.state}]: ${m.conflicts.join(", ")}`;
  }

  if (!m.merged && m.branch === "") {
    return "Merge aborted";
  }

  if (m.state === "already-up-to-date") {
    return `Already up to date with '${m.branch}'`;
  }

  const parts: string[] = [];
  if (m.state === "fast-forward") {
    parts.push(`Fast-forward merge of '${m.branch}'`);
  } else {
    parts.push(`Merged '${m.branch}'`);
  }
  if (m.commitHash) {
    parts.push(`(${m.commitHash})`);
  }
  if (m.mergeBase) parts.push(`[base ${m.mergeBase.slice(0, 8)}]`);
  return parts.join(" ");
}

// ── Log-graph formatters ──────────────────────────────────────────────

/** Formats structured git log-graph data into a human-readable graph view. */
export function formatLogGraph(lg: GitLogGraphFull): string {
  const total = lg.commits.filter((c) => c.hashShort !== "").length;
  if (total === 0) return "No commits found";
  return lg.commits
    .map((c) => {
      if (c.hashShort === "") return c.graph;
      const refs = c.refs ? ` (${c.refs})` : "";
      const merge = c.isMerge ? " [merge]" : "";
      const parents = c.parents && c.parents.length > 0 ? ` <${c.parents.join(" ")}>` : "";
      return `${c.graph} ${c.hashShort}${parents} ${c.message}${refs}${merge}`;
    })
    .join("\n");
}

/** Compact log-graph: drops pure graph continuation lines, keeps only commit entries. */
export interface GitLogGraphCompact {
  [key: string]: unknown;
  commits: Array<{ g: string; h: string; m: string; r?: string }>;
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
  };
}

export function formatLogGraphCompact(lg: GitLogGraphCompact): string {
  if (lg.commits.length === 0) return "No commits found";
  return lg.commits.map((c) => `${c.g} ${c.h} ${c.m}${c.r ? ` (${c.r})` : ""}`).join("\n");
}

// ── Reflog formatters ─────────────────────────────────────────────────

/** Formats structured git reflog data into a human-readable reflog listing. */
export function formatReflog(r: GitReflogFull): string {
  if (r.entries.length === 0) return "No reflog entries found";
  const lines = r.entries
    .map((e) => {
      const desc = e.description ? `: ${e.description}` : "";
      const move = e.fromRef && e.toRef ? ` [${e.fromRef} -> ${e.toRef}]` : "";
      return `${e.shortHash} ${e.selector} ${e.action}${desc}${move} (${e.date})`;
    })
    .join("\n");
  return lines;
}

/** Compact reflog: selector + action + description as string array. */
export interface GitReflogCompact {
  [key: string]: unknown;
  entries: string[];
}

export function compactReflogMap(r: GitReflogFull): GitReflogCompact {
  return {
    entries: r.entries.map((e) => {
      const desc = e.description ? `: ${e.description}` : "";
      return `${e.shortHash} ${e.selector} ${e.action}${desc}`;
    }),
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
    if (b.result.filesChanged && b.result.filesChanged.length > 0) {
      parts.push(`Files: ${b.result.filesChanged.join(", ")}`);
    }
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
      const locked = wt.locked ? (wt.lockReason ? ` [locked: ${wt.lockReason}]` : " [locked]") : "";
      const prunable = wt.prunable ? " [prunable]" : "";
      return `${wt.path}  ${wt.head.slice(0, 8)}${branch}${bare}${locked}${prunable}`;
    })
    .join("\n");
}

/** Compact worktree list: path + branch as string array. */
export interface GitWorktreeListCompact {
  [key: string]: unknown;
  worktrees: string[];
}

export function compactWorktreeListMap(w: GitWorktreeListFull): GitWorktreeListCompact {
  return {
    worktrees: w.worktrees.map((wt) => {
      const branch = wt.branch ? ` (${wt.branch})` : "";
      return `${wt.path}${branch}`;
    }),
  };
}

export function formatWorktreeListCompact(w: GitWorktreeListCompact): string {
  if (w.worktrees.length === 0) return "No worktrees found";
  return w.worktrees.join("\n");
}

/** Formats structured git worktree add/remove result into a human-readable summary. */
export function formatWorktree(w: GitWorktree): string {
  const action = w.action ? `${w.action}: ` : "";
  const branch = w.branch ? ` on branch '${w.branch}'` : "";
  const head = w.head ? ` at ${w.head}` : "";
  const target = w.targetPath ? ` -> '${w.targetPath}'` : "";
  return `${action}Worktree at '${w.path}'${target}${branch}${head}`;
}

// ── Bisect run formatter ────────────────────────────────────────────────

/** Formats structured git bisect run result into a human-readable summary. */
export function formatBisectRun(b: GitBisect): string {
  const steps = b.stepsRun ?? 0;
  const cmd = b.command ?? "unknown";

  if (b.result) {
    const parts = [
      `Bisect run found culprit in ${steps} step(s): ${b.result.hash.slice(0, 8)} ${b.result.message}`,
    ];
    if (b.result.author) parts.push(`Author: ${b.result.author}`);
    if (b.result.date) parts.push(`Date: ${b.result.date}`);
    parts.push(`Command: ${cmd}`);
    return parts.join("\n");
  }

  return `Bisect run completed (${steps} step(s)) — command: ${cmd}`;
}

// ── Remote mutate formatter ─────────────────────────────────────────────

/** Formats structured git remote add/remove/rename/set-url/prune/show result into a human-readable summary. */
export function formatRemoteMutate(r: GitRemoteMutate): string {
  if (r.action === "add") {
    return `Remote '${r.name}' added${r.url ? ` → ${r.url}` : ""}`;
  }
  if (r.action === "rename") {
    return `Remote '${r.oldName}' renamed to '${r.newName}'`;
  }
  if (r.action === "set-url") {
    return `Remote '${r.name}' URL set to ${r.url}`;
  }
  if (r.action === "prune") {
    const pruned =
      r.prunedBranches && r.prunedBranches.length > 0
        ? `: ${r.prunedBranches.join(", ")}`
        : " (nothing to prune)";
    return `Pruned remote '${r.name}'${pruned}`;
  }
  if (r.action === "show") {
    const parts = [`Remote '${r.name}':`];
    if (r.showDetails) {
      if (r.showDetails.fetchUrl) parts.push(`  Fetch URL: ${r.showDetails.fetchUrl}`);
      if (r.showDetails.pushUrl) parts.push(`  Push URL: ${r.showDetails.pushUrl}`);
      if (r.showDetails.headBranch) parts.push(`  HEAD branch: ${r.showDetails.headBranch}`);
      if (r.showDetails.remoteBranches && r.showDetails.remoteBranches.length > 0) {
        parts.push(`  Remote branches: ${r.showDetails.remoteBranches.join(", ")}`);
      }
      if (r.showDetails.localBranches && r.showDetails.localBranches.length > 0) {
        parts.push(`  Local branches: ${r.showDetails.localBranches.join(", ")}`);
      }
    }
    return parts.join("\n");
  }
  if (r.action === "update") {
    return `Remote update completed for '${r.name}'`;
  }
  return `Remote '${r.name}' removed`;
}

// ── Tag mutate formatter ────────────────────────────────────────────────

/** Formats structured git tag create/delete result into a human-readable summary. */
export function formatTagMutate(t: GitTagMutate): string {
  if (t.action === "create") {
    const type = t.annotated ? "Annotated tag" : "Lightweight tag";
    return `${type} '${t.name}' created${t.commit ? ` at ${t.commit}` : ""}`;
  }
  return `Tag '${t.name}' deleted`;
}

// ── Submodule formatter ─────────────────────────────────────────────────

/** Formats structured git submodule output into a human-readable summary. */
export function formatSubmodule(s: GitSubmodule): string {
  if (s.action !== "list" || !s.submodules || s.submodules.length === 0) {
    return s.message;
  }
  const lines = s.submodules.map(
    (sub) =>
      `${sub.status === "up-to-date" ? " " : sub.status === "modified" ? "+" : "-"} ${sub.sha.slice(0, 7)} ${sub.path}${sub.branch ? ` (${sub.branch})` : ""}`,
  );
  return `${s.submodules.length} submodule(s)\n${lines.join("\n")}`;
}

// ── Archive formatter ───────────────────────────────────────────────────

/** Formats structured git archive output into a human-readable summary. */
export function formatArchive(a: GitArchive): string {
  return a.message;
}

// ── Clean formatter ─────────────────────────────────────────────────────

/** Formats structured git clean output into a human-readable summary. */
export function formatClean(c: GitClean): string {
  if (c.files.length === 0) {
    return c.message;
  }
  const lines = c.files.map((f) => `  ${f}`);
  return `${c.message}\n${lines.join("\n")}`;
}

// ── Config formatter ────────────────────────────────────────────────────

/** Formats structured git config output into a human-readable summary. */
export function formatConfig(c: GitConfig): string {
  if (c.action === "list" && c.entries && c.entries.length > 0) {
    const lines = c.entries.map((e) => `${e.key}=${e.value}${e.scope ? ` [${e.scope}]` : ""}`);
    return `${c.entries.length} config entries\n${lines.join("\n")}`;
  }
  return c.message;
}
