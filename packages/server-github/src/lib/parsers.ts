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
    // S-gap fields
    author: raw.author?.login ?? undefined,
    labels: raw.labels ? (raw.labels as { name: string }[]).map((l) => l.name) : undefined,
    isDraft: raw.isDraft ?? undefined,
    assignees: raw.assignees
      ? (raw.assignees as { login: string }[]).map((a) => a.login)
      : undefined,
    createdAt: raw.createdAt ?? undefined,
    updatedAt: raw.updatedAt ?? undefined,
    milestone: raw.milestone?.title ?? undefined,
    projectItems: raw.projectItems
      ? (raw.projectItems as { title: string }[]).map((p) => p.title)
      : undefined,
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
      baseRefName?: string;
      author: { login: string };
      labels?: { name: string }[];
      isDraft?: boolean;
      reviewDecision?: string;
      mergeable?: string;
    }) => ({
      number: pr.number,
      state: pr.state,
      title: pr.title,
      url: pr.url,
      headBranch: pr.headRefName,
      author: pr.author?.login ?? "",
      // S-gap fields
      labels: pr.labels ? pr.labels.map((l) => l.name) : undefined,
      isDraft: pr.isDraft ?? undefined,
      baseBranch: pr.baseRefName ?? undefined,
      reviewDecision: pr.reviewDecision ?? undefined,
      mergeable: pr.mergeable ?? undefined,
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
export function parsePrMerge(
  stdout: string,
  number: number,
  method: string,
  deleteBranch?: boolean,
): PrMergeResult {
  const urlMatch = stdout.match(/(https:\/\/github\.com\/[^\s]+\/pull\/\d+)/);
  const url = urlMatch ? urlMatch[1] : "";
  // S-gap: detect if branch was deleted from output
  const branchDeleted =
    deleteBranch !== undefined
      ? /deleted branch|branch.*deleted/i.test(stdout)
        ? true
        : deleteBranch
      : undefined;
  return { number, merged: true, method, url, branchDeleted };
}

/**
 * Parses `gh pr comment` / `gh issue comment` output into structured data.
 * The gh CLI prints the new comment URL to stdout.
 * S-gap: Enhanced to include operation type, commentId, number, and body echo.
 */
export function parseComment(
  stdout: string,
  opts?: {
    operation?: "create" | "edit" | "delete";
    issueNumber?: number;
    prNumber?: number;
    body?: string;
  },
): CommentResult {
  const url = stdout.trim();
  // S-gap: extract commentId from URL (e.g., #issuecomment-123456)
  const commentIdMatch = url.match(/#issuecomment-(\d+)/);
  const commentId = commentIdMatch ? commentIdMatch[1] : undefined;

  return {
    url: url || undefined,
    operation: opts?.operation,
    commentId,
    issueNumber: opts?.issueNumber,
    prNumber: opts?.prNumber,
    body: opts?.body,
  };
}

/**
 * Parses `gh pr review` output into structured data.
 * The gh CLI prints a confirmation message with the PR URL on success.
 * S-gap: Enhanced to include reviewId, reviewDecision, and body echo.
 */
export function parsePrReview(
  stdout: string,
  number: number,
  event: string,
  body?: string,
): PrReviewResult {
  const urlMatch = stdout.match(/(https:\/\/github\.com\/[^\s]+\/pull\/\d+)/);
  const url = urlMatch ? urlMatch[1] : "";
  return {
    number,
    event,
    url,
    body: body ?? undefined,
  };
}

/**
 * Parses `gh pr checks --json ...` output into structured PR checks data.
 * Computes summary counts by bucket (pass, fail, pending, skipping, cancel).
 */
export function parsePrChecks(json: string, pr: number): PrChecksResult {
  const raw = JSON.parse(json);
  const items = Array.isArray(raw) ? raw : [];

  const checks = items.map(
    (c: {
      name?: string;
      state?: string;
      bucket?: string;
      description?: string;
      event?: string;
      workflow?: string;
      link?: string;
      startedAt?: string;
      completedAt?: string;
      isRequired?: boolean;
      conclusion?: string;
    }) => ({
      name: c.name ?? "",
      state: c.state ?? "",
      bucket: c.bucket ?? "",
      description: c.description ?? "",
      event: c.event ?? "",
      workflow: c.workflow ?? "",
      link: c.link ?? "",
      startedAt: c.startedAt ?? "",
      completedAt: c.completedAt ?? "",
      // S-gap fields
      required: c.isRequired ?? undefined,
      conclusion: c.conclusion ?? undefined,
    }),
  );

  const summary = {
    total: checks.length,
    passed: checks.filter((c) => c.bucket === "pass").length,
    failed: checks.filter((c) => c.bucket === "fail").length,
    pending: checks.filter((c) => c.bucket === "pending").length,
    skipped: checks.filter((c) => c.bucket === "skipping").length,
    cancelled: checks.filter((c) => c.bucket === "cancel").length,
  };

  return { pr, checks, summary };
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
    // S-gap fields
    stateReason: raw.stateReason ?? undefined,
    author: raw.author?.login ?? undefined,
    milestone: raw.milestone?.title ?? undefined,
    updatedAt: raw.updatedAt ?? undefined,
    closedAt: raw.closedAt ?? undefined,
    isPinned: raw.isPinned ?? undefined,
    projectItems: raw.projectItems
      ? (raw.projectItems as { title: string }[]).map((p) => p.title)
      : undefined,
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
      author?: { login: string };
      createdAt?: string;
      milestone?: { title: string } | null;
    }) => ({
      number: issue.number,
      state: issue.state,
      title: issue.title,
      url: issue.url,
      labels: (issue.labels ?? []).map((l) => l.name),
      assignees: (issue.assignees ?? []).map((a) => a.login),
      // S-gap fields
      author: issue.author?.login ?? undefined,
      createdAt: issue.createdAt ?? undefined,
      milestone: issue.milestone?.title ?? undefined,
    }),
  );

  return { issues, total: issues.length };
}

/**
 * Parses `gh issue create` output (URL on stdout) into structured data.
 * The gh CLI prints the new issue URL to stdout. We extract the number from it.
 * S-gap: Enhanced to echo back applied labels.
 */
export function parseIssueCreate(stdout: string, labels?: string[]): IssueCreateResult {
  const url = stdout.trim();
  const match = url.match(/\/issues\/(\d+)$/);
  const number = match ? parseInt(match[1], 10) : 0;
  return {
    number,
    url,
    labelsApplied: labels && labels.length > 0 ? labels : undefined,
  };
}

/**
 * Parses `gh issue close` output into structured data.
 * The gh CLI prints a confirmation URL to stdout. We extract the number from it.
 * S-gap: Enhanced to include reason and commentUrl.
 */
export function parseIssueClose(
  stdout: string,
  number: number,
  reason?: string,
  comment?: string,
): IssueCloseResult {
  const url = stdout.trim();
  // S-gap: Extract comment URL from output if a comment was added
  const commentUrlMatch = stdout.match(/(https:\/\/github\.com\/[^\s]+#issuecomment-\d+)/);
  return {
    number,
    state: "closed",
    url,
    reason: reason ?? undefined,
    commentUrl: comment && commentUrlMatch ? commentUrlMatch[1] : undefined,
  };
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
 * S-gap: Enhanced to include job steps.
 */
export function parseRunView(json: string): RunViewResult {
  const raw = JSON.parse(json);

  const jobs = (raw.jobs ?? []).map(
    (j: {
      name: string;
      status: string;
      conclusion: string | null;
      steps?: { name: string; status: string; conclusion: string | null }[];
    }) => ({
      name: j.name,
      status: j.status,
      conclusion: j.conclusion ?? null,
      // S-gap: Include steps array
      steps: j.steps
        ? j.steps.map((s) => ({
            name: s.name,
            status: s.status,
            conclusion: s.conclusion ?? null,
          }))
        : undefined,
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
 * S-gap: Enhanced to include job field.
 */
export function parseRunRerun(
  stdout: string,
  stderr: string,
  runId: number,
  failedOnly: boolean,
  job?: string,
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
    job: job ?? undefined,
  };
}

/**
 * Parses `gh release create` output (URL on stdout) into structured data.
 * The gh CLI prints the new release URL to stdout.
 * S-gap: Enhanced to include title, assetsUploaded count.
 */
export function parseReleaseCreate(
  stdout: string,
  tag: string,
  draft: boolean,
  prerelease: boolean,
  title?: string,
  assetsCount?: number,
): ReleaseCreateResult {
  const url = stdout.trim();
  return {
    tag,
    url,
    draft,
    prerelease,
    title: title ?? undefined,
    assetsUploaded: assetsCount ?? undefined,
  };
}

/**
 * Parses `gh release list --json ...` output into structured release list data.
 * S-gap: Enhanced to include isLatest and createdAt.
 */
export function parseReleaseList(json: string): ReleaseListResult {
  const raw = JSON.parse(json);
  const items = Array.isArray(raw) ? raw : [];

  const releases = items.map(
    (r: {
      tagName: string;
      name: string;
      isDraft: boolean;
      isPrerelease: boolean;
      publishedAt: string;
      url: string;
      isLatest?: boolean;
      createdAt?: string;
    }) => ({
      tag: r.tagName ?? "",
      name: r.name ?? "",
      draft: r.isDraft ?? false,
      prerelease: r.isPrerelease ?? false,
      publishedAt: r.publishedAt ?? "",
      url: r.url ?? "",
      // S-gap fields
      isLatest: r.isLatest ?? undefined,
      createdAt: r.createdAt ?? undefined,
    }),
  );

  return { releases, total: releases.length };
}

/**
 * Parses `gh api` stdout into structured API result data.
 * Attempts to parse stdout as JSON; falls back to raw string body.
 */
export function parseApi(
  stdout: string,
  exitCode: number,
  endpoint: string,
  method: string,
): ApiResult {
  // gh api returns exit code 0 for success. Map to HTTP-like status codes.
  const status = exitCode === 0 ? 200 : 422;

  let body: unknown;
  try {
    body = JSON.parse(stdout);
  } catch {
    body = stdout;
  }

  return { status, body, endpoint, method };
}

/**
 * Parses `gh gist create` output (URL on stdout) into structured data.
 * The gh CLI prints the new gist URL to stdout. We extract the ID from it.
 * S-gap: Enhanced to include files, description, fileCount.
 */
export function parseGistCreate(
  stdout: string,
  isPublic: boolean,
  files?: string[],
  description?: string,
): GistCreateResult {
  const url = stdout.trim();
  const match = url.match(/\/([a-f0-9]+)$/);
  const id = match ? match[1] : "";
  return {
    id,
    url,
    public: isPublic,
    files: files ?? undefined,
    description: description ?? undefined,
    fileCount: files ? files.length : undefined,
  };
}

/**
 * Parses `gh pr diff --numstat` output into structured PR diff data.
 * The numstat format is: additions\tdeletions\tfilename per line.
 */
export function parsePrDiffNumstat(stdout: string): PrDiffResult {
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
            : "modified") as PrDiffResult["files"][number]["status"],
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
