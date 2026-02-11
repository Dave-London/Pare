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
  const header = `${(s.hash ?? "").slice(0, 8)} ${s.message}\nAuthor: ${s.author ?? ""} <${s.email ?? ""}>\nDate: ${s.date ?? ""}`;
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
  files: Array<{ file: string; additions: number; deletions: number }>;
  totalFiles: number;
}

export function compactDiffMap(diff: GitDiff): GitDiffCompact {
  return {
    files: diff.files.map((f) => ({
      file: f.file,
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
