import { z } from "zod";

// ── PR schemas ───────────────────────────────────────────────────────

/** Zod schema for a single status check on a PR. */
export const PrCheckSchema = z.object({
  name: z.string(),
  status: z.string(),
  conclusion: z.string().nullable(),
});

/** Zod schema for a single review on a PR (P1-gap #147). */
export const PrReviewItemSchema = z.object({
  author: z.string(),
  state: z.string(),
  body: z.string().optional(),
  submittedAt: z.string().optional(),
});

/** Zod schema for structured pr-view output. */
export const PrViewResultSchema = z.object({
  number: z.number(),
  state: z.string(),
  title: z.string(),
  body: z.string().nullable().optional(),
  mergeable: z.string(),
  reviewDecision: z.string(),
  checks: z.array(PrCheckSchema).optional(),
  url: z.string(),
  headBranch: z.string(),
  baseBranch: z.string(),
  additions: z.number(),
  deletions: z.number(),
  changedFiles: z.number(),
  checksTotal: z.number().optional(),
  // S-gap: Add author, labels, isDraft, assignees, createdAt, updatedAt, milestone, projectItems
  author: z.string().optional(),
  labels: z.array(z.string()).optional(),
  isDraft: z.boolean().optional(),
  assignees: z.array(z.string()).optional(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
  milestone: z.string().nullable().optional(),
  projectItems: z.array(z.string()).optional(),
  // P1-gap #147: Add multi-reviewer visibility
  reviews: z.array(PrReviewItemSchema).optional(),
});

export type PrViewResult = z.infer<typeof PrViewResultSchema>;

/** Zod schema for a single PR in list output. */
export const PrListItemSchema = z.object({
  number: z.number(),
  state: z.string(),
  title: z.string(),
  url: z.string().optional(),
  headBranch: z.string().optional(),
  author: z.string().optional(),
  // S-gap: Add labels, isDraft, baseBranch, reviewDecision, mergeable
  labels: z.array(z.string()).optional(),
  isDraft: z.boolean().optional(),
  baseBranch: z.string().optional(),
  reviewDecision: z.string().optional(),
  mergeable: z.string().optional(),
});

/** Zod schema for structured pr-list output. */
export const PrListResultSchema = z.object({
  prs: z.array(PrListItemSchema),
  total: z.number(),
});

export type PrListResult = z.infer<typeof PrListResultSchema>;

/** Zod schema for structured pr-create output. */
export const PrCreateResultSchema = z.object({
  number: z.number(),
  url: z.string(),
});

export type PrCreateResult = z.infer<typeof PrCreateResultSchema>;

/** Zod schema for structured pr-merge output. */
export const PrMergeResultSchema = z.object({
  number: z.number(),
  merged: z.boolean(),
  method: z.string(),
  url: z.string(),
  // S-gap: Add branchDeleted field
  branchDeleted: z.boolean().optional(),
  /** Merge commit SHA when available from the output. */
  mergeCommitSha: z.string().optional(),
  /** Distinguishes immediate merge vs auto-merge enabled. */
  state: z.enum(["merged", "auto-merge-enabled", "auto-merge-disabled"]).optional(),
});

export type PrMergeResult = z.infer<typeof PrMergeResultSchema>;

/** Zod schema for structured pr-review output. */
export const PrReviewResultSchema = z.object({
  number: z.number(),
  event: z.string(),
  url: z.string(),
  // S-gap: Add reviewId, reviewDecision, body echo
  reviewId: z.string().optional(),
  reviewDecision: z.string().optional(),
  body: z.string().optional(),
  // P1-gap #146: Structured error classification for review failures
  errorType: z
    .enum(["not-found", "permission-denied", "already-reviewed", "draft-pr", "unknown"])
    .optional(),
});

export type PrReviewResult = z.infer<typeof PrReviewResultSchema>;

/** Zod schema for a single file entry in a PR diff. */
export const PrDiffFileSchema = z.object({
  file: z.string(),
  status: z.enum(["added", "modified", "deleted", "renamed", "copied"]),
  additions: z.number(),
  deletions: z.number(),
  oldFile: z.string().optional(),
  chunks: z
    .array(
      z.object({
        header: z.string(),
        lines: z.string(),
      }),
    )
    .optional(),
  // S-gap: Add mode/permissions field
  mode: z.string().optional(),
  /** True when the file is binary (e.g. images, compiled assets). */
  binary: z.boolean().optional(),
});

/** Zod schema for structured pr-diff output. */
export const PrDiffResultSchema = z.object({
  files: z.array(PrDiffFileSchema),
  // S-gap: Make totalAdditions/totalDeletions required (no longer optional)
  totalAdditions: z.number(),
  totalDeletions: z.number(),
  totalFiles: z.number(),
  // S-gap: Add truncation detection
  truncated: z.boolean().optional(),
});

export type PrDiffResult = z.infer<typeof PrDiffResultSchema>;

// ── Issue schemas ────────────────────────────────────────────────────

/** Zod schema for structured issue-view output. */
export const IssueViewResultSchema = z.object({
  number: z.number(),
  state: z.string(),
  title: z.string(),
  body: z.string().nullable().optional(),
  labels: z.array(z.string()),
  assignees: z.array(z.string()),
  url: z.string(),
  createdAt: z.string(),
  // S-gap: Add stateReason, author, milestone, updatedAt, closedAt, isPinned, projectItems
  stateReason: z.string().nullable().optional(),
  author: z.string().optional(),
  milestone: z.string().nullable().optional(),
  updatedAt: z.string().optional(),
  closedAt: z.string().nullable().optional(),
  isPinned: z.boolean().optional(),
  projectItems: z.array(z.string()).optional(),
});

export type IssueViewResult = z.infer<typeof IssueViewResultSchema>;

/** Zod schema for a single issue in list output. */
export const IssueListItemSchema = z.object({
  number: z.number(),
  state: z.string(),
  title: z.string(),
  url: z.string().optional(),
  labels: z.array(z.string()).optional(),
  assignees: z.array(z.string()).optional(),
  // S-gap: Add author, createdAt, milestone
  author: z.string().optional(),
  createdAt: z.string().optional(),
  milestone: z.string().nullable().optional(),
});

/** Zod schema for structured issue-list output. */
export const IssueListResultSchema = z.object({
  issues: z.array(IssueListItemSchema),
  total: z.number(),
});

export type IssueListResult = z.infer<typeof IssueListResultSchema>;

/** Zod schema for structured issue-create output. */
export const IssueCreateResultSchema = z.object({
  number: z.number(),
  url: z.string(),
  // S-gap: Add labelsApplied confirmation
  labelsApplied: z.array(z.string()).optional(),
});

export type IssueCreateResult = z.infer<typeof IssueCreateResultSchema>;

/** Zod schema for structured issue-close output. */
export const IssueCloseResultSchema = z.object({
  number: z.number(),
  state: z.string(),
  url: z.string(),
  // S-gap: Add reason echo, commentUrl
  reason: z.string().optional(),
  commentUrl: z.string().optional(),
  // P1-gap #144: Detect already-closed issues
  alreadyClosed: z.boolean().optional(),
});

export type IssueCloseResult = z.infer<typeof IssueCloseResultSchema>;

// ── Comment schemas (shared by pr-comment and issue-comment) ─────────

/** Zod schema for structured comment result output. */
export const CommentResultSchema = z.object({
  // S-gap: Make url optional (may not always be available)
  url: z.string().optional(),
  // S-gap: Add operation type, commentId, issueNumber/prNumber, body echo
  operation: z.enum(["create", "edit", "delete"]).optional(),
  commentId: z.string().optional(),
  issueNumber: z.number().optional(),
  prNumber: z.number().optional(),
  body: z.string().optional(),
});

export type CommentResult = z.infer<typeof CommentResultSchema>;

/** Zod schema for structured pr-update / issue-update output. */
export const EditResultSchema = z.object({
  number: z.number(),
  url: z.string(),
});

export type EditResult = z.infer<typeof EditResultSchema>;

// ── PR Checks schemas ───────────────────────────────────────────────

/** Zod schema for a single check entry from `gh pr checks`. */
export const PrChecksItemSchema = z.object({
  name: z.string(),
  state: z.string(),
  bucket: z.string(),
  description: z.string(),
  event: z.string(),
  workflow: z.string(),
  link: z.string(),
  startedAt: z.string(),
  completedAt: z.string(),
  // S-gap: Add per-check required field and conclusion
  required: z.boolean().optional(),
  conclusion: z.string().optional(),
});

/** Zod schema for summary counts of PR checks. */
export const PrChecksSummarySchema = z.object({
  total: z.number(),
  passed: z.number(),
  failed: z.number(),
  pending: z.number(),
  skipped: z.number(),
  cancelled: z.number(),
});

/** Zod schema for structured pr-checks output. */
export const PrChecksResultSchema = z.object({
  pr: z.number(),
  checks: z.array(PrChecksItemSchema).optional(),
  summary: PrChecksSummarySchema.optional(),
  total: z.number().optional(),
  passed: z.number().optional(),
  failed: z.number().optional(),
  pending: z.number().optional(),
});

export type PrChecksItem = z.infer<typeof PrChecksItemSchema>;
export type PrChecksSummary = z.infer<typeof PrChecksSummarySchema>;
export type PrChecksResult = z.infer<typeof PrChecksResultSchema>;

// ── Run schemas ──────────────────────────────────────────────────────

/** Zod schema for a single step in a job. */
export const RunStepSchema = z.object({
  name: z.string(),
  status: z.string(),
  conclusion: z.string().nullable(),
});

/** Zod schema for a single job in a workflow run. */
export const RunJobSchema = z.object({
  name: z.string(),
  status: z.string(),
  conclusion: z.string().nullable(),
  // S-gap: Add steps array
  steps: z.array(RunStepSchema).optional(),
});

/** Zod schema for structured run-view output. */
export const RunViewResultSchema = z.object({
  id: z.number(),
  status: z.string(),
  conclusion: z.string().nullable(),
  name: z.string().optional(),
  workflowName: z.string(),
  headBranch: z.string(),
  jobs: z.array(RunJobSchema).optional(),
  url: z.string(),
  createdAt: z.string().optional(),
  jobsTotal: z.number().optional(),
  /** The HEAD commit SHA for this run. */
  headSha: z.string().optional(),
  /** The event that triggered the run (e.g. push, pull_request). */
  event: z.string().optional(),
  /** When the run actually started executing. */
  startedAt: z.string().optional(),
  /** The attempt number for re-runs (1 = first attempt). */
  attempt: z.number().optional(),
});

export type RunViewResult = z.infer<typeof RunViewResultSchema>;

/** Zod schema for a single run in list output. */
export const RunListItemSchema = z.object({
  id: z.number(),
  status: z.string(),
  conclusion: z.string().nullable(),
  name: z.string().optional(),
  workflowName: z.string(),
  headBranch: z.string().optional(),
  url: z.string().optional(),
  createdAt: z.string().optional(),
  // P1-gap #148: Expand run-list with additional fields
  headSha: z.string().optional(),
  event: z.string().optional(),
  startedAt: z.string().optional(),
  attempt: z.number().optional(),
});

/** Zod schema for structured run-list output. */
export const RunListResultSchema = z.object({
  runs: z.array(RunListItemSchema),
  total: z.number(),
});

export type RunListResult = z.infer<typeof RunListResultSchema>;

/** Zod schema for structured run-rerun output. */
export const RunRerunResultSchema = z.object({
  runId: z.number(),
  status: z.string(),
  failedOnly: z.boolean(),
  url: z.string(),
  // S-gap: Add job field when rerunning a specific job
  job: z.string().optional(),
  // P1-gap #149: Track rerun attempt number and new run URL
  attempt: z.number().optional(),
  newRunUrl: z.string().optional(),
});

export type RunRerunResult = z.infer<typeof RunRerunResultSchema>;

// ── Release schemas ─────────────────────────────────────────────────

/** Zod schema for structured release-create output. */
export const ReleaseCreateResultSchema = z.object({
  tag: z.string(),
  url: z.string(),
  draft: z.boolean(),
  prerelease: z.boolean(),
  // S-gap: Expanded output schema fields
  id: z.string().optional(),
  title: z.string().optional(),
  isLatest: z.boolean().optional(),
  assetsUploaded: z.number().optional(),
});

export type ReleaseCreateResult = z.infer<typeof ReleaseCreateResultSchema>;

// ── Gist schemas ────────────────────────────────────────────────────

/** Zod schema for structured gist-create output. */
export const GistCreateResultSchema = z.object({
  id: z.string(),
  url: z.string(),
  public: z.boolean(),
  // S-gap: Add files, description, fileCount echoes
  files: z.array(z.string()).optional(),
  description: z.string().optional(),
  fileCount: z.number().optional(),
});

export type GistCreateResult = z.infer<typeof GistCreateResultSchema>;

/** Zod schema for a single release in list output. */
export const ReleaseListItemSchema = z.object({
  tag: z.string(),
  name: z.string(),
  draft: z.boolean(),
  prerelease: z.boolean(),
  publishedAt: z.string().optional(),
  url: z.string().optional(),
  // S-gap: Add isLatest, createdAt
  isLatest: z.boolean().optional(),
  createdAt: z.string().optional(),
});

/** Zod schema for structured release-list output. */
export const ReleaseListResultSchema = z.object({
  releases: z.array(ReleaseListItemSchema),
  total: z.number(),
});

export type ReleaseListResult = z.infer<typeof ReleaseListResultSchema>;

// ── API schemas ─────────────────────────────────────────────────────

/** Zod schema for structured gh api output. */
export const ApiResultSchema = z.object({
  status: z.number(),
  /** Real HTTP status code parsed from response headers. */
  statusCode: z.number(),
  body: z.unknown(),
  endpoint: z.string(),
  method: z.string(),
  // P1-gap #141: Preserve API error body for debugging
  errorBody: z.unknown().optional(),
});

export type ApiResult = z.infer<typeof ApiResultSchema>;
