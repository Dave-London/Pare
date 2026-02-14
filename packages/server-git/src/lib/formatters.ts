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
  return `Pushed to ${p.remote}/${p.branch}: ${p.summary}`;
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
  return parts.join("\n");
}

/** Formats structured git checkout data into a human-readable checkout summary. */
export function formatCheckout(c: GitCheckout): string {
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

/** Compact show: hashShort + first line of message only, no diff or author details. */
export interface GitShowCompact {
  [key: string]: unknown;
  hashShort: string;
  message: string;
}

export function compactShowMap(s: GitShow): GitShowCompact {
  return {
    hashShort: s.hashShort ?? (s.hash ?? "").slice(0, 7),
    message: s.message.split("\n")[0],
  };
}

export function formatShowCompact(s: GitShowCompact): string {
  return `${s.hashShort} ${s.message}`;
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
  return s.stashes.map((st) => `stash@{${st.index}}: ${st.message} (${st.date})`).join("\n");
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
  return s.message;
}

// ── Remote formatters ────────────────────────────────────────────────

/** Formats structured git remote data into a human-readable remote listing. */
export function formatRemote(r: GitRemoteFull): string {
  if (r.remotes.length === 0) return "No remotes configured";
  return r.remotes
    .map(
      (remote) =>
        `${remote.name}\t${remote.fetchUrl} (fetch)\n${remote.name}\t${remote.pushUrl} (push)`,
    )
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
