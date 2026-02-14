import type {
  PrViewResult,
  PrListResult,
  PrCreateResult,
  PrMergeResult,
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
  if (data.checks.length > 0) {
    lines.push(`  checks:`);
    for (const c of data.checks) {
      lines.push(`    ${c.name}: ${c.status} (${c.conclusion ?? "pending"})`);
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
    lines.push(`  #${pr.number} ${pr.title} (${pr.state}) [${pr.headBranch}] @${pr.author}`);
  }
  return lines.join("\n");
}

/** Formats structured PR create data into human-readable text. */
export function formatPrCreate(data: PrCreateResult): string {
  return `Created PR #${data.number}: ${data.url}`;
}

/** Formats structured PR merge data into human-readable text. */
export function formatPrMerge(data: PrMergeResult): string {
  return `Merged PR #${data.number} via ${data.method}: ${data.url}`;
}

/** Formats structured comment result into human-readable text. */
export function formatComment(data: CommentResult): string {
  return `Comment added: ${data.url}`;
}

/** Formats structured PR review data into human-readable text. */
export function formatPrReview(data: PrReviewResult): string {
  return `Reviewed PR #${data.number} (${data.event}): ${data.url}`;
}

/** Formats structured PR update data into human-readable text. */
export function formatPrUpdate(data: EditResult): string {
  return `Updated PR #${data.number}: ${data.url}`;
}

/** Formats structured PR checks data into human-readable text. */
export function formatPrChecks(data: PrChecksResult): string {
  const { summary } = data;
  const lines = [
    `PR #${data.pr}: ${summary.total} checks (${summary.passed} passed, ${summary.failed} failed, ${summary.pending} pending)`,
  ];
  for (const c of data.checks) {
    const workflow = c.workflow ? ` [${c.workflow}]` : "";
    lines.push(`  ${c.name}: ${c.state} (${c.bucket})${workflow}`);
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
  return {
    pr: data.pr,
    total: data.summary.total,
    passed: data.summary.passed,
    failed: data.summary.failed,
    pending: data.summary.pending,
  };
}

export function formatPrChecksCompact(data: PrChecksCompact): string {
  return `PR #${data.pr}: ${data.total} checks (${data.passed} passed, ${data.failed} failed, ${data.pending} pending)`;
}

/** Formats structured issue view data into human-readable text. */
export function formatIssueView(data: IssueViewResult): string {
  const lines = [
    `Issue #${data.number}: ${data.title} (${data.state})`,
    `  created: ${data.createdAt}`,
    `  ${data.url}`,
  ];
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
    const labels = issue.labels.length > 0 ? ` [${issue.labels.join(", ")}]` : "";
    lines.push(`  #${issue.number} ${issue.title} (${issue.state})${labels}`);
  }
  return lines.join("\n");
}

/** Formats structured issue create data into human-readable text. */
export function formatIssueCreate(data: IssueCreateResult): string {
  return `Created issue #${data.number}: ${data.url}`;
}

/** Formats structured issue close data into human-readable text. */
export function formatIssueClose(data: IssueCloseResult): string {
  return `Closed issue #${data.number}: ${data.url}`;
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
  if (data.jobs.length > 0) {
    lines.push(`  jobs:`);
    for (const j of data.jobs) {
      lines.push(`    ${j.name}: ${j.status} (${j.conclusion ?? "pending"})`);
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
    lines.push(
      `  #${r.id} ${r.workflowName} / ${r.name} (${r.status}${conclusion}) [${r.headBranch}]`,
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
    checksTotal: data.checks.length,
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
    jobsTotal: data.jobs.length,
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
