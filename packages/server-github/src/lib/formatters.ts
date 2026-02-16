import type {
  PrViewResult,
  PrListResult,
  PrCreateResult,
  PrMergeResult,
  PrDiffResult,
  CommentResult,
  PrReviewResult,
  EditResult,
  PrChecksResult,
  IssueViewResult,
  IssueListResult,
  IssueCreateResult,
  IssueCloseResult,
  RunViewResult,
  RunListResult,
  RunRerunResult,
  ReleaseCreateResult,
  GistCreateResult,
  ReleaseListResult,
  ApiResult,
} from "../schemas/index.js";

// ── Full formatters ──────────────────────────────────────────────────

/** Formats structured PR view data into human-readable text. */
export function formatPrView(data: PrViewResult): string {
  const lines = [
    `PR #${data.number}: ${data.title} (${data.state})`,
    `  ${data.headBranch} → ${data.baseBranch}`,
    `  mergeable: ${data.mergeable}, review: ${data.reviewDecision || "none"}`,
    `  +${data.additions} -${data.deletions} (${data.changedFiles} files)`,
    `  ${data.url}`,
  ];
  // S-gap: Show author, labels, isDraft, assignees
  if (data.author) lines.push(`  author: @${data.author}`);
  if (data.isDraft !== undefined) lines.push(`  draft: ${data.isDraft}`);
  if (data.labels && data.labels.length > 0) lines.push(`  labels: ${data.labels.join(", ")}`);
  if (data.assignees && data.assignees.length > 0)
    lines.push(`  assignees: ${data.assignees.join(", ")}`);
  if (data.milestone) lines.push(`  milestone: ${data.milestone}`);
  if (data.createdAt) lines.push(`  created: ${data.createdAt}`);
  if (data.updatedAt) lines.push(`  updated: ${data.updatedAt}`);
  if ((data.checks ?? []).length > 0) {
    lines.push(`  checks:`);
    for (const c of data.checks ?? []) {
      lines.push(`    ${c.name}: ${c.status} (${c.conclusion ?? "pending"})`);
    }
  }
  // P1-gap #147: Show reviews
  if (data.reviews && data.reviews.length > 0) {
    lines.push(`  reviews:`);
    for (const r of data.reviews) {
      const bodySnippet = r.body
        ? ` — ${r.body.slice(0, 80)}${r.body.length > 80 ? "..." : ""}`
        : "";
      lines.push(`    @${r.author}: ${r.state}${bodySnippet}`);
    }
  }
  if (data.body) {
    lines.push(`  body: ${data.body.slice(0, 200)}${data.body.length > 200 ? "..." : ""}`);
  }
  return lines.join("\n");
}

/** Formats structured PR list data into human-readable text. */
export function formatPrList(data: PrListResult): string {
  if (data.total === 0) return "No pull requests found.";

  const lines = [`${data.total} pull requests:`];
  for (const pr of data.prs) {
    const branch = pr.headBranch ? ` [${pr.headBranch}]` : "";
    const author = pr.author ? ` @${pr.author}` : "";
    const labels = pr.labels && pr.labels.length > 0 ? ` {${pr.labels.join(", ")}}` : "";
    const draft = pr.isDraft ? " (draft)" : "";
    lines.push(`  #${pr.number} ${pr.title} (${pr.state})${branch}${author}${labels}${draft}`);
  }
  return lines.join("\n");
}

/** Formats structured PR create data into human-readable text. */
export function formatPrCreate(data: PrCreateResult): string {
  return `Created PR #${data.number}: ${data.url}`;
}

/** Formats structured PR merge data into human-readable text. */
export function formatPrMerge(data: PrMergeResult): string {
  const branchInfo =
    data.branchDeleted !== undefined
      ? data.branchDeleted
        ? " (branch deleted)"
        : " (branch kept)"
      : "";
  const shaInfo = data.mergeCommitSha ? ` [${data.mergeCommitSha.slice(0, 7)}]` : "";

  if (data.state === "auto-merge-enabled") {
    return `Auto-merge enabled for PR #${data.number} via ${data.method}: ${data.url}`;
  }
  if (data.state === "auto-merge-disabled") {
    return `Auto-merge disabled for PR #${data.number}: ${data.url}`;
  }
  return `Merged PR #${data.number} via ${data.method}${shaInfo}: ${data.url}${branchInfo}`;
}

/** Formats structured comment result into human-readable text. */
export function formatComment(data: CommentResult): string {
  const op = data.operation ? `${data.operation}d` : "added";
  const idPart = data.commentId ? ` (id: ${data.commentId})` : "";
  return `Comment ${op}${idPart}: ${data.url ?? ""}`;
}

/** Formats structured PR review data into human-readable text. */
export function formatPrReview(data: PrReviewResult): string {
  const errorPart = data.errorType ? ` [error: ${data.errorType}]` : "";
  return `Reviewed PR #${data.number} (${data.event}): ${data.url}${errorPart}`;
}

/** Formats structured PR update data into human-readable text. */
export function formatPrUpdate(data: EditResult): string {
  return `Updated PR #${data.number}: ${data.url}`;
}

/** Formats structured PR checks data into human-readable text. */
export function formatPrChecks(data: PrChecksResult): string {
  const summary = data.summary ?? {
    total: 0,
    passed: 0,
    failed: 0,
    pending: 0,
    skipped: 0,
    cancelled: 0,
  };
  const lines = [
    `PR #${data.pr}: ${summary.total} checks (${summary.passed} passed, ${summary.failed} failed, ${summary.pending} pending)`,
  ];
  for (const c of data.checks ?? []) {
    const workflow = c.workflow ? ` [${c.workflow}]` : "";
    const required = c.required ? " *required*" : "";
    lines.push(`  ${c.name}: ${c.state} (${c.bucket})${workflow}${required}`);
  }
  return lines.join("\n");
}

/** Compact PR checks: summary only, no individual checks. */
export interface PrChecksCompact {
  [key: string]: unknown;
  pr: number;
  total: number;
  passed: number;
  failed: number;
  pending: number;
}

export function compactPrChecksMap(data: PrChecksResult): PrChecksCompact {
  const summary = data.summary ?? {
    total: 0,
    passed: 0,
    failed: 0,
    pending: 0,
    skipped: 0,
    cancelled: 0,
  };
  return {
    pr: data.pr,
    total: summary.total,
    passed: summary.passed,
    failed: summary.failed,
    pending: summary.pending,
  };
}

export function formatPrChecksCompact(data: PrChecksCompact): string {
  return `PR #${data.pr}: ${data.total} checks (${data.passed} passed, ${data.failed} failed, ${data.pending} pending)`;
}

/** Formats structured PR diff data into a human-readable file change summary. */
export function formatPrDiff(diff: PrDiffResult): string {
  const files = diff.files
    .map((f) => {
      const binaryTag = f.binary ? " (binary)" : "";
      return `  ${f.file} +${f.additions} -${f.deletions}${binaryTag}`;
    })
    .join("\n");
  const truncatedNote = diff.truncated ? " (truncated)" : "";
  return `${diff.totalFiles} files changed, +${diff.totalAdditions} -${diff.totalDeletions}${truncatedNote}\n${files}`;
}

/** Formats structured issue view data into human-readable text. */
export function formatIssueView(data: IssueViewResult): string {
  const lines = [
    `Issue #${data.number}: ${data.title} (${data.state})`,
    `  created: ${data.createdAt}`,
    `  ${data.url}`,
  ];
  // S-gap: Show new fields
  if (data.author) lines.push(`  author: @${data.author}`);
  if (data.stateReason) lines.push(`  reason: ${data.stateReason}`);
  if (data.milestone) lines.push(`  milestone: ${data.milestone}`);
  if (data.updatedAt) lines.push(`  updated: ${data.updatedAt}`);
  if (data.closedAt) lines.push(`  closed: ${data.closedAt}`);
  if (data.isPinned) lines.push(`  pinned: true`);
  if (data.labels.length > 0) {
    lines.push(`  labels: ${data.labels.join(", ")}`);
  }
  if (data.assignees.length > 0) {
    lines.push(`  assignees: ${data.assignees.join(", ")}`);
  }
  if (data.body) {
    lines.push(`  body: ${data.body.slice(0, 200)}${data.body.length > 200 ? "..." : ""}`);
  }
  return lines.join("\n");
}

/** Formats structured issue list data into human-readable text. */
export function formatIssueList(data: IssueListResult): string {
  if (data.total === 0) return "No issues found.";

  const lines = [`${data.total} issues:`];
  for (const issue of data.issues) {
    const labels = (issue.labels ?? []).length > 0 ? ` [${(issue.labels ?? []).join(", ")}]` : "";
    const author = issue.author ? ` @${issue.author}` : "";
    lines.push(`  #${issue.number} ${issue.title} (${issue.state})${labels}${author}`);
  }
  return lines.join("\n");
}

/** Formats structured issue create data into human-readable text. */
export function formatIssueCreate(data: IssueCreateResult): string {
  const labelsPart =
    data.labelsApplied && data.labelsApplied.length > 0
      ? ` [${data.labelsApplied.join(", ")}]`
      : "";
  return `Created issue #${data.number}: ${data.url}${labelsPart}`;
}

/** Formats structured issue close data into human-readable text. */
export function formatIssueClose(data: IssueCloseResult): string {
  const reasonPart = data.reason ? ` (${data.reason})` : "";
  const alreadyPart = data.alreadyClosed ? " [already closed]" : "";
  return `Closed issue #${data.number}${reasonPart}: ${data.url}${alreadyPart}`;
}

/** Formats structured issue update data into human-readable text. */
export function formatIssueUpdate(data: EditResult): string {
  return `Updated issue #${data.number}: ${data.url}`;
}

/** Formats structured run view data into human-readable text. */
export function formatRunView(data: RunViewResult): string {
  const lines = [
    `Run #${data.id}: ${data.workflowName} / ${data.name} (${data.status})`,
    `  conclusion: ${data.conclusion ?? "pending"}`,
    `  branch: ${data.headBranch}`,
    `  created: ${data.createdAt}`,
    `  ${data.url}`,
  ];
  if (data.headSha) lines.push(`  sha: ${data.headSha}`);
  if (data.event) lines.push(`  event: ${data.event}`);
  if (data.startedAt) lines.push(`  started: ${data.startedAt}`);
  if (data.attempt !== undefined) lines.push(`  attempt: ${data.attempt}`);
  if ((data.jobs ?? []).length > 0) {
    lines.push(`  jobs:`);
    for (const j of data.jobs ?? []) {
      lines.push(`    ${j.name}: ${j.status} (${j.conclusion ?? "pending"})`);
      // S-gap: Show steps if present
      if (j.steps && j.steps.length > 0) {
        for (const s of j.steps) {
          lines.push(`      ${s.name}: ${s.status} (${s.conclusion ?? "pending"})`);
        }
      }
    }
  }
  return lines.join("\n");
}

/** Formats structured run list data into human-readable text. */
export function formatRunList(data: RunListResult): string {
  if (data.total === 0) return "No workflow runs found.";

  const lines = [`${data.total} workflow runs:`];
  for (const r of data.runs) {
    const conclusion = r.conclusion ? ` → ${r.conclusion}` : "";
    const sha = r.headSha ? ` ${r.headSha.slice(0, 7)}` : "";
    const evt = r.event ? ` (${r.event})` : "";
    lines.push(
      `  #${r.id} ${r.workflowName} / ${r.name} (${r.status}${conclusion}) [${r.headBranch}]${sha}${evt}`,
    );
  }
  return lines.join("\n");
}

// ── Compact types, mappers, and formatters ───────────────────────────

/** Compact PR view: key fields, no body or checks details. */
export interface PrViewCompact {
  [key: string]: unknown;
  number: number;
  state: string;
  title: string;
  mergeable: string;
  reviewDecision: string;
  url: string;
  headBranch: string;
  baseBranch: string;
  additions: number;
  deletions: number;
  changedFiles: number;
  checksTotal: number;
}

export function compactPrViewMap(data: PrViewResult): PrViewCompact {
  return {
    number: data.number,
    state: data.state,
    title: data.title,
    mergeable: data.mergeable,
    reviewDecision: data.reviewDecision,
    url: data.url,
    headBranch: data.headBranch,
    baseBranch: data.baseBranch,
    additions: data.additions,
    deletions: data.deletions,
    changedFiles: data.changedFiles,
    checksTotal: (data.checks ?? []).length,
  };
}

export function formatPrViewCompact(data: PrViewCompact): string {
  return `PR #${data.number}: ${data.title} (${data.state}) +${data.additions} -${data.deletions} (${data.changedFiles} files), ${data.checksTotal} checks`;
}

/** Compact PR list: number, title, state only. */
export interface PrListCompact {
  [key: string]: unknown;
  prs: { number: number; title: string; state: string }[];
  total: number;
}

export function compactPrListMap(data: PrListResult): PrListCompact {
  return {
    prs: data.prs.map((pr) => ({
      number: pr.number,
      title: pr.title,
      state: pr.state,
    })),
    total: data.total,
  };
}

export function formatPrListCompact(data: PrListCompact): string {
  if (data.total === 0) return "No pull requests found.";
  const lines = [`${data.total} PRs:`];
  for (const pr of data.prs) {
    lines.push(`  #${pr.number} ${pr.title} (${pr.state})`);
  }
  return lines.join("\n");
}

/** Compact PR diff: file-level stats only, no chunks or aggregate totals. */
export interface PrDiffCompact {
  [key: string]: unknown;
  files: Array<{
    file: string;
    status: "added" | "modified" | "deleted" | "renamed" | "copied";
    additions: number;
    deletions: number;
  }>;
  totalFiles: number;
}

export function compactPrDiffMap(data: PrDiffResult): PrDiffCompact {
  return {
    files: data.files.map((f) => ({
      file: f.file,
      status: f.status,
      additions: f.additions,
      deletions: f.deletions,
    })),
    totalFiles: data.totalFiles,
  };
}

export function formatPrDiffCompact(diff: PrDiffCompact): string {
  const files = diff.files.map((f) => `  ${f.file} +${f.additions} -${f.deletions}`).join("\n");
  return `${diff.totalFiles} files changed\n${files}`;
}

/** Compact issue view: key fields, no body. */
export interface IssueViewCompact {
  [key: string]: unknown;
  number: number;
  state: string;
  title: string;
  url: string;
  labels: string[];
  assignees: string[];
  createdAt: string;
}

export function compactIssueViewMap(data: IssueViewResult): IssueViewCompact {
  return {
    number: data.number,
    state: data.state,
    title: data.title,
    url: data.url,
    labels: data.labels,
    assignees: data.assignees,
    createdAt: data.createdAt,
  };
}

export function formatIssueViewCompact(data: IssueViewCompact): string {
  const labels = data.labels.length > 0 ? ` [${data.labels.join(", ")}]` : "";
  return `Issue #${data.number}: ${data.title} (${data.state})${labels}`;
}

/** Compact issue list: number, title, state only. */
export interface IssueListCompact {
  [key: string]: unknown;
  issues: { number: number; title: string; state: string }[];
  total: number;
}

export function compactIssueListMap(data: IssueListResult): IssueListCompact {
  return {
    issues: data.issues.map((i) => ({
      number: i.number,
      title: i.title,
      state: i.state,
    })),
    total: data.total,
  };
}

export function formatIssueListCompact(data: IssueListCompact): string {
  if (data.total === 0) return "No issues found.";
  const lines = [`${data.total} issues:`];
  for (const i of data.issues) {
    lines.push(`  #${i.number} ${i.title} (${i.state})`);
  }
  return lines.join("\n");
}

/** Compact run view: key fields, no jobs. */
export interface RunViewCompact {
  [key: string]: unknown;
  id: number;
  status: string;
  conclusion: string | null;
  workflowName: string;
  headBranch: string;
  jobsTotal: number;
  url: string;
}

export function compactRunViewMap(data: RunViewResult): RunViewCompact {
  return {
    id: data.id,
    status: data.status,
    conclusion: data.conclusion,
    workflowName: data.workflowName,
    headBranch: data.headBranch,
    jobsTotal: (data.jobs ?? []).length,
    url: data.url,
  };
}

export function formatRunViewCompact(data: RunViewCompact): string {
  const conclusion = data.conclusion ? ` → ${data.conclusion}` : "";
  return `Run #${data.id}: ${data.workflowName} (${data.status}${conclusion}) [${data.headBranch}], ${data.jobsTotal} jobs`;
}

/** Compact run list: id, workflow, status only. */
export interface RunListCompact {
  [key: string]: unknown;
  runs: { id: number; workflowName: string; status: string; conclusion: string | null }[];
  total: number;
}

export function compactRunListMap(data: RunListResult): RunListCompact {
  return {
    runs: data.runs.map((r) => ({
      id: r.id,
      workflowName: r.workflowName,
      status: r.status,
      conclusion: r.conclusion,
    })),
    total: data.total,
  };
}

export function formatRunListCompact(data: RunListCompact): string {
  if (data.total === 0) return "No workflow runs found.";
  const lines = [`${data.total} runs:`];
  for (const r of data.runs) {
    const conclusion = r.conclusion ? ` → ${r.conclusion}` : "";
    lines.push(`  #${r.id} ${r.workflowName} (${r.status}${conclusion})`);
  }
  return lines.join("\n");
}

/** Formats structured run rerun data into human-readable text. */
export function formatRunRerun(data: RunRerunResult): string {
  const mode = data.failedOnly ? "failed jobs only" : data.job ? `job ${data.job}` : "all jobs";
  const urlPart = data.url ? `: ${data.url}` : "";
  const attemptPart = data.attempt !== undefined ? `, attempt #${data.attempt}` : "";
  const newUrlPart = data.newRunUrl ? ` → ${data.newRunUrl}` : "";
  return `Rerun requested for run #${data.runId} (${mode})${attemptPart}${urlPart}${newUrlPart}`;
}

// ── Gist ────────────────────────────────────────────────────────────

/** Formats structured gist create data into human-readable text. */
export function formatGistCreate(data: GistCreateResult): string {
  const visibility = data.public ? "public" : "secret";
  const filesPart = data.files && data.files.length > 0 ? ` (${data.files.join(", ")})` : "";
  const descPart = data.description ? ` — ${data.description}` : "";
  return `Created ${visibility} gist ${data.id}: ${data.url}${filesPart}${descPart}`;
}

// ── Release ─────────────────────────────────────────────────────────

/** Formats structured release create data into human-readable text. */
export function formatReleaseCreate(data: ReleaseCreateResult): string {
  const flags = [data.draft ? "draft" : "", data.prerelease ? "prerelease" : ""]
    .filter(Boolean)
    .join(", ");
  const suffix = flags ? ` (${flags})` : "";
  const assetsPart =
    data.assetsUploaded !== undefined ? `, ${data.assetsUploaded} assets uploaded` : "";
  return `Created release ${data.tag}${suffix}: ${data.url}${assetsPart}`;
}

/** Formats structured release list data into human-readable text. */
export function formatReleaseList(data: ReleaseListResult): string {
  if (data.total === 0) return "No releases found.";

  const lines = [`${data.total} releases:`];
  for (const r of data.releases) {
    const flags = [
      r.draft ? "draft" : "",
      r.prerelease ? "prerelease" : "",
      r.isLatest ? "latest" : "",
    ]
      .filter(Boolean)
      .join(", ");
    const suffix = flags ? ` (${flags})` : "";
    lines.push(`  ${r.tag} ${r.name}${suffix} — ${r.publishedAt ?? ""}`);
  }
  return lines.join("\n");
}

/** Compact release list: tag, name, and flags only. */
export interface ReleaseListCompact {
  [key: string]: unknown;
  releases: { tag: string; name: string; draft: boolean; prerelease: boolean }[];
  total: number;
}

export function compactReleaseListMap(data: ReleaseListResult): ReleaseListCompact {
  return {
    releases: data.releases.map((r) => ({
      tag: r.tag,
      name: r.name,
      draft: r.draft,
      prerelease: r.prerelease,
    })),
    total: data.total,
  };
}

export function formatReleaseListCompact(data: ReleaseListCompact): string {
  if (data.total === 0) return "No releases found.";
  const lines = [`${data.total} releases:`];
  for (const r of data.releases) {
    const flags = [r.draft ? "draft" : "", r.prerelease ? "prerelease" : ""]
      .filter(Boolean)
      .join(", ");
    const suffix = flags ? ` (${flags})` : "";
    lines.push(`  ${r.tag} ${r.name}${suffix}`);
  }
  return lines.join("\n");
}

// ── API ─────────────────────────────────────────────────────────────

/** Formats structured API result into human-readable text. */
export function formatApi(data: ApiResult): string {
  const bodyStr = typeof data.body === "string" ? data.body : JSON.stringify(data.body, null, 2);
  const preview = bodyStr.length > 500 ? bodyStr.slice(0, 500) + "..." : bodyStr;
  // P1-gap #141: Include error body in formatted output
  const errorPart = data.errorBody
    ? `\nError: ${typeof data.errorBody === "string" ? data.errorBody : JSON.stringify(data.errorBody)}`
    : "";
  return `${data.method} ${data.endpoint} → ${data.statusCode}\n${preview}${errorPart}`;
}
