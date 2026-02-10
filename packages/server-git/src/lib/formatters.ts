import type {
  GitStatus,
  GitLog,
  GitDiff,
  GitBranch,
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
  return `${diff.totalFiles} files changed, +${diff.totalAdditions} -${diff.totalDeletions}\n${files}`;
}

/** Formats structured git branch data into a human-readable branch listing. */
export function formatBranch(b: GitBranch): string {
  return b.branches.map((br) => `${br.current ? "* " : "  "}${br.name}`).join("\n");
}

/** Formats structured git show data into a human-readable commit detail view with diff summary. */
export function formatShow(s: GitShow): string {
  const header = `${s.hash.slice(0, 8)} ${s.message}\nAuthor: ${s.author} <${s.email}>\nDate: ${s.date}`;
  const diff = formatDiff(s.diff);
  return `${header}\n\n${diff}`;
}

/** Formats structured git add data into a human-readable summary of staged files. */
export function formatAdd(a: GitAdd): string {
  if (a.staged === 0) return "No files staged";
  return `Staged ${a.staged} file(s): ${a.files.join(", ")}`;
}

/** Formats structured git commit data into a human-readable commit summary. */
export function formatCommit(c: GitCommit): string {
  const stats = [
    `${c.filesChanged} file(s) changed`,
    `+${c.insertions}`,
    `-${c.deletions}`,
  ].join(", ");
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
