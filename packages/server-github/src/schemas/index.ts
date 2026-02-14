import { z } from "zod";

// ── PR schemas ───────────────────────────────────────────────────────

/** Zod schema for a single status check on a PR. */
export const PrCheckSchema = z.object({
  name: z.string(),
  status: z.string(),
  conclusion: z.string().nullable(),
});

/** Zod schema for structured pr-view output. */
export const PrViewResultSchema = z.object({
  number: z.number(),
  state: z.string(),
  title: z.string(),
  body: z.string().nullable(),
  mergeable: z.string(),
  reviewDecision: z.string(),
  checks: z.array(PrCheckSchema),
  url: z.string(),
  headBranch: z.string(),
  baseBranch: z.string(),
  additions: z.number(),
  deletions: z.number(),
  changedFiles: z.number(),
});

export type PrViewResult = z.infer<typeof PrViewResultSchema>;

/** Zod schema for a single PR in list output. */
export const PrListItemSchema = z.object({
  number: z.number(),
  state: z.string(),
  title: z.string(),
  url: z.string(),
  headBranch: z.string(),
  author: z.string(),
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
});

export type PrMergeResult = z.infer<typeof PrMergeResultSchema>;

/** Zod schema for structured pr-review output. */
export const PrReviewResultSchema = z.object({
  number: z.number(),
  event: z.string(),
  url: z.string(),
});

export type PrReviewResult = z.infer<typeof PrReviewResultSchema>;

// ── Issue schemas ────────────────────────────────────────────────────

/** Zod schema for structured issue-view output. */
export const IssueViewResultSchema = z.object({
  number: z.number(),
  state: z.string(),
  title: z.string(),
  body: z.string().nullable(),
  labels: z.array(z.string()),
  assignees: z.array(z.string()),
  url: z.string(),
  createdAt: z.string(),
});

export type IssueViewResult = z.infer<typeof IssueViewResultSchema>;

/** Zod schema for a single issue in list output. */
export const IssueListItemSchema = z.object({
  number: z.number(),
  state: z.string(),
  title: z.string(),
  url: z.string(),
  labels: z.array(z.string()),
  assignees: z.array(z.string()),
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
});

export type IssueCreateResult = z.infer<typeof IssueCreateResultSchema>;

/** Zod schema for structured issue-close output. */
export const IssueCloseResultSchema = z.object({
  number: z.number(),
  state: z.string(),
  url: z.string(),
});

export type IssueCloseResult = z.infer<typeof IssueCloseResultSchema>;

// ── Comment schemas (shared by pr-comment and issue-comment) ─────────

/** Zod schema for structured comment result output. */
export const CommentResultSchema = z.object({
  url: z.string(),
});

export type CommentResult = z.infer<typeof CommentResultSchema>;

/** Zod schema for structured pr-update / issue-update output. */
export const EditResultSchema = z.object({
  number: z.number(),
  url: z.string(),
});

export type EditResult = z.infer<typeof EditResultSchema>;

// ── Run schemas ──────────────────────────────────────────────────────

/** Zod schema for a single job in a workflow run. */
export const RunJobSchema = z.object({
  name: z.string(),
  status: z.string(),
  conclusion: z.string().nullable(),
});

/** Zod schema for structured run-view output. */
export const RunViewResultSchema = z.object({
  id: z.number(),
  status: z.string(),
  conclusion: z.string().nullable(),
  name: z.string(),
  workflowName: z.string(),
  headBranch: z.string(),
  jobs: z.array(RunJobSchema),
  url: z.string(),
  createdAt: z.string(),
});

export type RunViewResult = z.infer<typeof RunViewResultSchema>;

/** Zod schema for a single run in list output. */
export const RunListItemSchema = z.object({
  id: z.number(),
  status: z.string(),
  conclusion: z.string().nullable(),
  name: z.string(),
  workflowName: z.string(),
  headBranch: z.string(),
  url: z.string(),
  createdAt: z.string(),
});

/** Zod schema for structured run-list output. */
export const RunListResultSchema = z.object({
  runs: z.array(RunListItemSchema),
  total: z.number(),
});

export type RunListResult = z.infer<typeof RunListResultSchema>;
