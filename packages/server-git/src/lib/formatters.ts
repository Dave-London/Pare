import type { GitStatus, GitLog, GitDiff, GitBranch, GitShow } from "../schemas/index.js";

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

export function formatLog(log: GitLog): string {
  return log.commits.map((c) => `${c.hashShort} ${c.message} (${c.author}, ${c.date})`).join("\n");
}

export function formatDiff(diff: GitDiff): string {
  const files = diff.files.map((f) => `  ${f.file} +${f.additions} -${f.deletions}`).join("\n");
  return `${diff.totalFiles} files changed, +${diff.totalAdditions} -${diff.totalDeletions}\n${files}`;
}

export function formatBranch(b: GitBranch): string {
  return b.branches.map((br) => `${br.current ? "* " : "  "}${br.name}`).join("\n");
}

export function formatShow(s: GitShow): string {
  const header = `${s.hash.slice(0, 8)} ${s.message}\nAuthor: ${s.author} <${s.email}>\nDate: ${s.date}`;
  const diff = formatDiff(s.diff);
  return `${header}\n\n${diff}`;
}
