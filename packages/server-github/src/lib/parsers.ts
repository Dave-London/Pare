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
  LabelListResult,
  LabelCreateResult,
  RepoViewResult,
  RepoCloneResult,
  DiscussionListResult,
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

  // P1-gap #147: Parse reviews array
  const reviews = raw.reviews
    ? (
        raw.reviews as {
          author: { login: string };
          state: string;
          body?: string;
          submittedAt?: string;
        }[]
      ).map((r) => ({
        author: r.author?.login ?? "unknown",
        state: r.state,
        body: r.body || undefined,
        submittedAt: r.submittedAt ?? undefined,
      }))
    : undefined;

  const commits = Array.isArray(raw.commits) ? raw.commits : [];
  const commitCount = commits.length > 0 ? commits.length : undefined;
  const latestCommitSha =
    commits.length > 0
      ? (commits[commits.length - 1]?.oid ?? commits[commits.length - 1]?.commit?.oid ?? undefined)
      : undefined;

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
    // P1-gap #147
    reviews,
    commitCount,
    latestCommitSha,
  };
}

/**
 * Parses `gh pr list --json ...` output into structured PR list data.
 */
export function parsePrList(json: string, totalAvailable?: number): PrListResult {
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

  return { prs, total: prs.length, totalAvailable };
}

/**
 * Parses `gh pr create` output (URL on stdout) into structured data.
 * The gh CLI prints the new PR URL to stdout. We extract the number from it.
 */
export function parsePrCreate(
  stdout: string,
  opts?: {
    title?: string;
    baseBranch?: string;
    headBranch?: string;
    draft?: boolean;
  },
): PrCreateResult {
  const url = stdout.trim();
  const match = url.match(/\/pull\/(\d+)$/);
  const number = match ? parseInt(match[1], 10) : 0;
  return {
    number,
    url,
    title: opts?.title,
    baseBranch: opts?.baseBranch,
    headBranch: opts?.headBranch,
    draft: opts?.draft,
  };
}

/**
 * Parses `gh pr edit` output into structured data.
 * The gh CLI prints the PR URL to stdout on success.
 */
export function parsePrUpdate(
  stdout: string,
  number: number,
  updatedFields?: string[],
  operations?: string[],
): EditResult {
  const urlMatch = stdout.match(/(https:\/\/github\.com\/[^\s]+\/pull\/\d+)/);
  const url = urlMatch ? urlMatch[1] : "";
  return { number, url, updatedFields, operations };
}

/**
 * Parses `gh pr merge` output into structured data.
 * The gh CLI prints a confirmation message with the PR URL on success.
 * Enhanced to detect merge commit SHA, auto-merge state, and merge method.
 */
export function parsePrMerge(
  stdout: string,
  number: number,
  method: string,
  deleteBranch?: boolean,
  auto?: boolean,
  disableAuto?: boolean,
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

  // Extract merge commit SHA if present in output
  // gh pr merge may output lines like "Merge commit SHA: abc123..." or include it in the URL
  const shaMatch = stdout.match(/\b([0-9a-f]{40})\b/);
  const mergeCommitSha = shaMatch ? shaMatch[1] : undefined;

  // Determine the merge state
  let state: "merged" | "auto-merge-enabled" | "auto-merge-disabled";
  if (disableAuto) {
    state = "auto-merge-disabled";
  } else if (auto || /auto-merge/i.test(stdout) || /automatically merge/i.test(stdout)) {
    state = "auto-merge-enabled";
  } else {
    state = "merged";
  }

  // Detect actual merge method from output text when possible
  let detectedMethod = method;
  if (/squashed and merged/i.test(stdout)) {
    detectedMethod = "squash";
  } else if (/rebased and merged/i.test(stdout)) {
    detectedMethod = "rebase";
  } else if (/merged.*pull request/i.test(stdout) && !/squashed|rebased/i.test(stdout)) {
    detectedMethod = "merge";
  }

  return {
    number,
    merged: state === "merged",
    method: detectedMethod,
    url,
    branchDeleted,
    mergeCommitSha,
    state,
  };
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
  stderr?: string,
): PrReviewResult {
  const urlMatch = stdout.match(/(https:\/\/github\.com\/[^\s]+\/pull\/\d+)/);
  const url = urlMatch ? urlMatch[1] : "";

  // P1-gap #145: Parse review event type from CLI output for confirmation
  // Map the CLI event name to GitHub's review event type
  const eventMap: Record<string, string> = {
    approve: "APPROVE",
    "request-changes": "REQUEST_CHANGES",
    comment: "COMMENT",
  };
  const resolvedEvent = eventMap[event] ?? event;

  // P1-gap #146: Classify review errors from stderr
  const errorType = stderr ? classifyReviewError(stderr) : undefined;

  return {
    number,
    event: resolvedEvent,
    url,
    body: body ?? undefined,
    errorType,
  };
}

/**
 * Classifies review error from stderr into structured error types.
 * P1-gap #146.
 */
function classifyReviewError(stderr: string): PrReviewResult["errorType"] {
  const lower = stderr.toLowerCase();
  if (/not found|could not resolve|no pull request/i.test(lower)) return "not-found";
  if (/permission|forbidden|403/i.test(lower)) return "permission-denied";
  if (/already reviewed|already approved|already submitted/i.test(lower)) return "already-reviewed";
  if (/draft|is a draft/i.test(lower)) return "draft-pr";
  if (stderr.trim()) return "unknown";
  return undefined;
}

/**
 * Parses `gh pr checks --json ...` output into structured PR checks data.
 * Computes summary counts by bucket (pass, fail, pending, skipping, cancel).
 * Deduplicates entries by check name, keeping the most recent run
 * (determined by completedAt, then startedAt, with later entries winning ties).
 */
export function parsePrChecks(json: string, pr: number): PrChecksResult {
  const raw = JSON.parse(json);
  const items = Array.isArray(raw) ? raw : [];

  const allChecks = items.map(
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
    }),
  );

  // Deduplicate by check name, keeping the most recent run.
  // For checks with the same name, prefer the one with the later completedAt
  // (or startedAt as fallback). If timestamps are equal, keep the later entry
  // in the array (which is typically the most recent re-run).
  const deduped = new Map<string, (typeof allChecks)[number]>();
  for (const check of allChecks) {
    const existing = deduped.get(check.name);
    if (!existing) {
      deduped.set(check.name, check);
      continue;
    }
    // Compare by completedAt first, then startedAt
    const existingTime = existing.completedAt || existing.startedAt || "";
    const newTime = check.completedAt || check.startedAt || "";
    if (newTime >= existingTime) {
      deduped.set(check.name, check);
    }
  }
  const checks = Array.from(deduped.values());

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
 * The gh CLI may print a confirmation message plus URL to stdout.
 * We robustly extract the issue URL using a regex rather than assuming
 * the entire stdout is just a URL (handles extra text, whitespace, and
 * different output formats).
 * S-gap: Enhanced to include reason and commentUrl.
 */
export function parseIssueClose(
  stdout: string,
  number: number,
  reason?: string,
  comment?: string,
  stderr?: string,
): IssueCloseResult {
  // Robust URL extraction: find the GitHub issue URL anywhere in the output
  const urlMatch = stdout.match(/(https:\/\/github\.com\/[^\s]+\/issues\/\d+)/);
  const url = urlMatch ? urlMatch[1] : stdout.trim();
  // S-gap: Extract comment URL from output if a comment was added
  const commentUrlMatch = stdout.match(/(https:\/\/github\.com\/[^\s]+#issuecomment-\d+)/);
  // P1-gap #144: Detect already-closed issues
  const combined = `${stdout}\n${stderr ?? ""}`;
  const alreadyClosed =
    /already closed/i.test(combined) ||
    /issue .* is already closed/i.test(combined) ||
    /already been closed/i.test(combined)
      ? true
      : undefined;

  return {
    number,
    state: "closed",
    url,
    reason: reason ?? undefined,
    commentUrl: comment && commentUrlMatch ? commentUrlMatch[1] : undefined,
    alreadyClosed,
  };
}

/**
 * Parses `gh issue edit` output into structured data.
 * The gh CLI prints the issue URL to stdout on success.
 */
export function parseIssueUpdate(
  stdout: string,
  number: number,
  updatedFields?: string[],
  operations?: string[],
): EditResult {
  const urlMatch = stdout.match(/(https:\/\/github\.com\/[^\s]+\/issues\/\d+)/);
  const url = urlMatch ? urlMatch[1] : "";
  return { number, url, updatedFields, operations };
}

/**
 * Parses `gh run view --json ...` output into structured run view data.
 * Renames gh field names (e.g., databaseId → id).
 * S-gap: Enhanced to include job steps, headSha, event, startedAt, attempt.
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

  const updatedAt = raw.updatedAt ?? undefined;
  const startedAt = raw.startedAt ?? undefined;
  const createdAt = raw.createdAt ?? "";
  let durationSeconds: number | undefined;
  const start = startedAt ? Date.parse(startedAt) : createdAt ? Date.parse(createdAt) : NaN;
  const end = updatedAt ? Date.parse(updatedAt) : NaN;
  if (Number.isFinite(start) && Number.isFinite(end) && end >= start) {
    durationSeconds = Math.round((end - start) / 1000);
  }

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
    // P0 enrichments
    headSha: raw.headSha ?? undefined,
    event: raw.event ?? undefined,
    startedAt,
    updatedAt,
    attempt: raw.attempt ?? undefined,
    durationSeconds,
  };
}

/**
 * Parses `gh run list --json ...` output into structured run list data.
 */
export function parseRunList(json: string, totalAvailable?: number): RunListResult {
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
      // P1-gap #148: Additional fields
      headSha?: string;
      event?: string;
      startedAt?: string;
      attempt?: number;
    }) => ({
      id: r.databaseId,
      status: r.status,
      conclusion: r.conclusion ?? null,
      name: r.name ?? r.displayTitle ?? "",
      workflowName: r.workflowName ?? "",
      headBranch: r.headBranch,
      url: r.url,
      createdAt: r.createdAt ?? "",
      // P1-gap #148
      headSha: r.headSha ?? undefined,
      event: r.event ?? undefined,
      startedAt: r.startedAt ?? undefined,
      attempt: r.attempt ?? undefined,
    }),
  );

  return { runs, total: runs.length, totalAvailable };
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

  // P1-gap #149: Parse attempt number from output
  const attemptMatch = combined.match(/attempt[\s#:]*?(\d+)/i);
  const attempt = attemptMatch ? parseInt(attemptMatch[1], 10) : undefined;

  // P1-gap #149: Extract new run URL if a different URL appears (for the new attempt)
  // Sometimes gh outputs the new run URL after a rerun
  const allUrls = combined.match(/https:\/\/github\.com\/[^\s]+\/actions\/runs\/\d+/g) ?? [];
  const newRunUrl = allUrls.length > 1 ? allUrls[allUrls.length - 1] : undefined;

  const status = job ? "requested-job" : failedOnly ? "requested-failed" : "requested-full";

  return {
    runId,
    status,
    failedOnly,
    url,
    job: job ?? undefined,
    attempt,
    newRunUrl,
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
export function parseReleaseList(json: string, totalAvailable?: number): ReleaseListResult {
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

  return { releases, total: releases.length, totalAvailable };
}

/**
 * Parses `gh api` stdout into structured API result data.
 * When `--include` is used, the output starts with HTTP headers followed by
 * a blank line and then the response body. We parse the real HTTP status code
 * from the status line and separate the body.
 */
export function parseApi(
  stdout: string,
  exitCode: number,
  endpoint: string,
  method: string,
  stderr?: string,
): ApiResult {
  // Default: infer status from exit code
  let statusCode = exitCode === 0 ? 200 : 422;
  let bodyText = stdout;

  let responseHeaders: Record<string, string> | undefined;
  let pagination: ApiResult["pagination"] | undefined;
  // When --include is passed, stdout starts with HTTP headers:
  // HTTP/2.0 200 OK\r\n...headers...\r\n\r\nbody
  const headerEndIndex = stdout.indexOf("\r\n\r\n");
  if (headerEndIndex !== -1) {
    const headerBlock = stdout.slice(0, headerEndIndex);
    bodyText = stdout.slice(headerEndIndex + 4);
    responseHeaders = parseHeaderBlock(headerBlock);
    pagination = parsePagination(responseHeaders?.link);

    // Parse status code from first line: "HTTP/1.1 200 OK" or "HTTP/2.0 200 OK"
    const statusMatch = headerBlock.match(/^HTTP\/[\d.]+ (\d+)/);
    if (statusMatch) {
      statusCode = parseInt(statusMatch[1], 10);
    }
  } else {
    // Also handle \n\n separator (some environments)
    const headerEndLF = stdout.indexOf("\n\n");
    if (headerEndLF !== -1 && /^HTTP\/[\d.]+ \d+/.test(stdout)) {
      const headerBlock = stdout.slice(0, headerEndLF);
      bodyText = stdout.slice(headerEndLF + 2);
      responseHeaders = parseHeaderBlock(headerBlock);
      pagination = parsePagination(responseHeaders?.link);

      const statusMatch = headerBlock.match(/^HTTP\/[\d.]+ (\d+)/);
      if (statusMatch) {
        statusCode = parseInt(statusMatch[1], 10);
      }
    }
  }

  // Keep legacy `status` as before for backward compat
  const status = exitCode === 0 ? 200 : 422;

  let body: unknown;
  try {
    body = JSON.parse(bodyText);
  } catch {
    body = bodyText;
  }

  // P1-gap #141: Preserve error body for debugging when request failed
  const errorBody = exitCode !== 0 && stderr ? parseErrorBody(stderr) : undefined;

  // GraphQL responses can return 200 with an `errors` array.
  const graphqlErrors =
    body && typeof body === "object" && "errors" in (body as Record<string, unknown>)
      ? (((body as Record<string, unknown>).errors as unknown[]) ?? undefined)
      : undefined;

  return {
    status,
    statusCode,
    body,
    endpoint,
    method,
    responseHeaders,
    pagination,
    graphqlErrors,
    errorBody,
  };
}

function parseHeaderBlock(headerBlock: string): Record<string, string> {
  const lines = headerBlock.split(/\r?\n/);
  const headers: Record<string, string> = {};
  for (const line of lines.slice(1)) {
    const idx = line.indexOf(":");
    if (idx <= 0) continue;
    const key = line.slice(0, idx).trim().toLowerCase();
    const value = line.slice(idx + 1).trim();
    headers[key] = value;
  }
  return headers;
}

function parsePagination(linkHeader?: string): ApiResult["pagination"] | undefined {
  if (!linkHeader) return undefined;
  const nextMatch = linkHeader.match(/<([^>]+)>;\s*rel=\"next\"/);
  const lastMatch = linkHeader.match(/<([^>]+)>;\s*rel=\"last\"/);
  return {
    hasNext: !!nextMatch,
    next: nextMatch?.[1],
    last: lastMatch?.[1],
  };
}

/**
 * Attempts to parse error body from stderr output.
 * gh api may output JSON error details or plain text to stderr.
 */
function parseErrorBody(stderr: string): unknown {
  const trimmed = stderr.trim();
  if (!trimmed) return undefined;
  try {
    return JSON.parse(trimmed);
  } catch {
    // Check if stderr contains an embedded JSON object (e.g., after a prefix message)
    const jsonMatch = trimmed.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        return JSON.parse(jsonMatch[0]);
      } catch {
        // fall through
      }
    }
    return trimmed;
  }
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
  const match =
    url.match(/gist\.github\.com\/(?:[^/]+\/)?([a-f0-9]+)/i) ||
    url.match(/\/([a-f0-9]+)(?:\/?$|[?#])/i);
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
 * Parses `gh label list --json ...` output into structured label list data.
 */
export function parseLabelList(json: string): LabelListResult {
  const raw = JSON.parse(json);
  const items = Array.isArray(raw) ? raw : [];

  const labels = items.map(
    (l: { name: string; description: string; color: string; isDefault: boolean }) => ({
      name: l.name ?? "",
      description: l.description ?? "",
      color: l.color ?? "",
      isDefault: l.isDefault ?? false,
    }),
  );

  return { labels, total: labels.length };
}

/**
 * Parses `gh label create` output into structured label create data.
 * The gh CLI prints a confirmation message to stderr on success.
 */
export function parseLabelCreate(
  stdout: string,
  stderr: string,
  name: string,
  description?: string,
  color?: string,
): LabelCreateResult {
  // gh label create outputs confirmation to stderr, e.g.:
  // "✓ Label "my-label" created in owner/repo"
  // Try to extract a URL if present
  const combined = `${stdout}\n${stderr}`;
  const urlMatch = combined.match(/(https:\/\/github\.com\/[^\s]+\/labels\/[^\s]+)/);
  const url = urlMatch ? urlMatch[1] : undefined;

  return {
    name,
    description: description ?? undefined,
    color: color ?? undefined,
    url,
  };
}

/**
 * Parses `gh repo view --json ...` output into structured repo view data.
 * Renames gh field names to our schema names (e.g., stargazerCount -> stars).
 */
export function parseRepoView(json: string): RepoViewResult {
  const raw = JSON.parse(json);

  return {
    name: raw.name ?? "",
    owner: raw.owner?.login ?? "",
    description: raw.description ?? null,
    url: raw.url ?? "",
    homepageUrl: raw.homepageUrl ?? undefined,
    defaultBranch: raw.defaultBranchRef?.name ?? "main",
    isPrivate: raw.isPrivate ?? false,
    isArchived: raw.isArchived ?? false,
    isFork: raw.isFork ?? false,
    stars: raw.stargazerCount ?? 0,
    forks: raw.forkCount ?? 0,
    languages: raw.languages
      ? (raw.languages as { node: { name: string } }[]).map((l) => l.node.name)
      : undefined,
    topics: raw.repositoryTopics
      ? (raw.repositoryTopics as { name: string }[]).map((t) => t.name)
      : undefined,
    license: raw.licenseInfo?.name ?? undefined,
    createdAt: raw.createdAt ?? undefined,
    updatedAt: raw.updatedAt ?? undefined,
    pushedAt: raw.pushedAt ?? undefined,
  };
}

/**
 * Parses `gh repo clone` output into structured repo clone data.
 * The gh CLI prints a confirmation message to stderr on success.
 */
export function parseRepoClone(
  stdout: string,
  stderr: string,
  repo: string,
  directory?: string,
): RepoCloneResult {
  const combined = `${stdout}\n${stderr}`.trim();
  return {
    success: true,
    repo,
    directory: directory ?? undefined,
    message: combined || `Cloned ${repo} successfully`,
  };
}

/**
 * Parses `gh api graphql` output for discussions into structured discussion list data.
 * The GraphQL response contains a repository.discussions object with nodes and totalCount.
 */
export function parseDiscussionList(json: string): DiscussionListResult {
  const raw = JSON.parse(json);
  const data = raw.data?.repository?.discussions ?? {};
  const nodes = Array.isArray(data.nodes) ? data.nodes : [];

  const discussions = nodes.map(
    (d: {
      number: number;
      title: string;
      author?: { login: string };
      category?: { name: string };
      createdAt: string;
      url: string;
      isAnswered?: boolean;
      comments?: { totalCount: number };
    }) => ({
      number: d.number,
      title: d.title,
      author: d.author?.login ?? "ghost",
      category: d.category?.name ?? "",
      createdAt: d.createdAt ?? "",
      url: d.url ?? "",
      isAnswered: d.isAnswered ?? false,
      comments: d.comments?.totalCount ?? 0,
    }),
  );

  return {
    discussions,
    totalCount: data.totalCount ?? discussions.length,
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
