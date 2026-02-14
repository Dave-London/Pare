import type {
  PrViewResult,
  PrListResult,
  PrCreateResult,
  PrMergeResult,
  CommentResult,
  PrReviewResult,
  EditResult,
  IssueViewResult,
  IssueListResult,
  IssueCreateResult,
  IssueCloseResult,
  RunViewResult,
  RunListResult,
  RunRerunResult,
} from "../schemas/index.js";

/**
 * Parses `gh pr view --json ...` output into structured PR view data.
 * Renames gh field names to our schema names (e.g., headRefName → headBranch).
 */
export function parsePrView(json: string): PrViewResult {
  const raw = JSON.parse(json);

  const checks = (raw.statusCheckRollup ?? []).map(
    (c: {
      name?: string;
      context?: string;
      status?: string;
      state?: string;
      conclusion?: string | null;
    }) => ({
      name: c.name || c.context || "unknown",
      status: c.status || c.state || "unknown",
      conclusion: c.conclusion ?? null,
    }),
  );

  return {
    number: raw.number,
    state: raw.state,
    title: raw.title,
    body: raw.body ?? null,
    mergeable: raw.mergeable ?? "UNKNOWN",
    reviewDecision: raw.reviewDecision ?? "",
    checks,
    url: raw.url,
    headBranch: raw.headRefName,
    baseBranch: raw.baseRefName,
    additions: raw.additions ?? 0,
    deletions: raw.deletions ?? 0,
    changedFiles: raw.changedFiles ?? 0,
  };
}

/**
 * Parses `gh pr list --json ...` output into structured PR list data.
 */
export function parsePrList(json: string): PrListResult {
  const raw = JSON.parse(json);
  const items = Array.isArray(raw) ? raw : [];

  const prs = items.map(
    (pr: {
      number: number;
      state: string;
      title: string;
      url: string;
      headRefName: string;
      author: { login: string };
    }) => ({
      number: pr.number,
      state: pr.state,
      title: pr.title,
      url: pr.url,
      headBranch: pr.headRefName,
      author: pr.author?.login ?? "",
    }),
  );

  return { prs, total: prs.length };
}

/**
 * Parses `gh pr create` output (URL on stdout) into structured data.
 * The gh CLI prints the new PR URL to stdout. We extract the number from it.
 */
export function parsePrCreate(stdout: string): PrCreateResult {
  const url = stdout.trim();
  const match = url.match(/\/pull\/(\d+)$/);
  const number = match ? parseInt(match[1], 10) : 0;
  return { number, url };
}

/**
 * Parses `gh pr edit` output into structured data.
 * The gh CLI prints the PR URL to stdout on success.
 */
export function parsePrUpdate(stdout: string, number: number): EditResult {
  const urlMatch = stdout.match(/(https:\/\/github\.com\/[^\s]+\/pull\/\d+)/);
  const url = urlMatch ? urlMatch[1] : "";
  return { number, url };
}

/**
 * Parses `gh pr merge` output into structured data.
 * The gh CLI prints a confirmation message with the PR URL on success.
 */
export function parsePrMerge(stdout: string, number: number, method: string): PrMergeResult {
  const urlMatch = stdout.match(/(https:\/\/github\.com\/[^\s]+\/pull\/\d+)/);
  const url = urlMatch ? urlMatch[1] : "";
  return { number, merged: true, method, url };
}

/**
 * Parses `gh pr comment` / `gh issue comment` output into structured data.
 * The gh CLI prints the new comment URL to stdout.
 */
export function parseComment(stdout: string): CommentResult {
  const url = stdout.trim();
  return { url };
}

/**
 * Parses `gh pr review` output into structured data.
 * The gh CLI prints a confirmation message with the PR URL on success.
 */
export function parsePrReview(stdout: string, number: number, event: string): PrReviewResult {
  const urlMatch = stdout.match(/(https:\/\/github\.com\/[^\s]+\/pull\/\d+)/);
  const url = urlMatch ? urlMatch[1] : "";
  return { number, event, url };
}

/**
 * Parses `gh issue view --json ...` output into structured issue view data.
 */
export function parseIssueView(json: string): IssueViewResult {
  const raw = JSON.parse(json);

  return {
    number: raw.number,
    state: raw.state,
    title: raw.title,
    body: raw.body ?? null,
    labels: (raw.labels ?? []).map((l: { name: string }) => l.name),
    assignees: (raw.assignees ?? []).map((a: { login: string }) => a.login),
    url: raw.url,
    createdAt: raw.createdAt ?? "",
  };
}

/**
 * Parses `gh issue list --json ...` output into structured issue list data.
 */
export function parseIssueList(json: string): IssueListResult {
  const raw = JSON.parse(json);
  const items = Array.isArray(raw) ? raw : [];

  const issues = items.map(
    (issue: {
      number: number;
      state: string;
      title: string;
      url: string;
      labels: { name: string }[];
      assignees: { login: string }[];
    }) => ({
      number: issue.number,
      state: issue.state,
      title: issue.title,
      url: issue.url,
      labels: (issue.labels ?? []).map((l) => l.name),
      assignees: (issue.assignees ?? []).map((a) => a.login),
    }),
  );

  return { issues, total: issues.length };
}

/**
 * Parses `gh issue create` output (URL on stdout) into structured data.
 * The gh CLI prints the new issue URL to stdout. We extract the number from it.
 */
export function parseIssueCreate(stdout: string): IssueCreateResult {
  const url = stdout.trim();
  const match = url.match(/\/issues\/(\d+)$/);
  const number = match ? parseInt(match[1], 10) : 0;
  return { number, url };
}

/**
 * Parses `gh issue close` output into structured data.
 * The gh CLI prints a confirmation URL to stdout. We extract the number from it.
 */
export function parseIssueClose(stdout: string, number: number): IssueCloseResult {
  const url = stdout.trim();
  return { number, state: "closed", url };
}

/**
 * Parses `gh issue edit` output into structured data.
 * The gh CLI prints the issue URL to stdout on success.
 */
export function parseIssueUpdate(stdout: string, number: number): EditResult {
  const urlMatch = stdout.match(/(https:\/\/github\.com\/[^\s]+\/issues\/\d+)/);
  const url = urlMatch ? urlMatch[1] : "";
  return { number, url };
}

/**
 * Parses `gh run view --json ...` output into structured run view data.
 * Renames gh field names (e.g., databaseId → id).
 */
export function parseRunView(json: string): RunViewResult {
  const raw = JSON.parse(json);

  const jobs = (raw.jobs ?? []).map(
    (j: { name: string; status: string; conclusion: string | null }) => ({
      name: j.name,
      status: j.status,
      conclusion: j.conclusion ?? null,
    }),
  );

  return {
    id: raw.databaseId,
    status: raw.status,
    conclusion: raw.conclusion ?? null,
    name: raw.name ?? raw.displayTitle ?? "",
    workflowName: raw.workflowName ?? "",
    headBranch: raw.headBranch,
    jobs,
    url: raw.url,
    createdAt: raw.createdAt ?? "",
  };
}

/**
 * Parses `gh run list --json ...` output into structured run list data.
 */
export function parseRunList(json: string): RunListResult {
  const raw = JSON.parse(json);
  const items = Array.isArray(raw) ? raw : [];

  const runs = items.map(
    (r: {
      databaseId: number;
      status: string;
      conclusion: string | null;
      name: string;
      displayTitle?: string;
      workflowName: string;
      headBranch: string;
      url: string;
      createdAt: string;
    }) => ({
      id: r.databaseId,
      status: r.status,
      conclusion: r.conclusion ?? null,
      name: r.name ?? r.displayTitle ?? "",
      workflowName: r.workflowName ?? "",
      headBranch: r.headBranch,
      url: r.url,
      createdAt: r.createdAt ?? "",
    }),
  );

  return { runs, total: runs.length };
}

/**
 * Parses `gh run rerun` output into structured data.
 * The gh CLI prints a confirmation message to stderr on success.
 * We construct the URL from the run ID and repo info.
 */
export function parseRunRerun(
  stdout: string,
  stderr: string,
  runId: number,
  failedOnly: boolean,
): RunRerunResult {
  // gh run rerun outputs confirmation to stderr, e.g.:
  // "✓ Requested rerun of run 12345"
  // Try to extract URL from stdout/stderr if present
  const combined = `${stdout}\n${stderr}`;
  const urlMatch = combined.match(/(https:\/\/github\.com\/[^\s]+\/actions\/runs\/\d+)/);
  const url = urlMatch ? urlMatch[1] : "";

  return {
    runId,
    status: "requested",
    failedOnly,
    url,
  };
}
