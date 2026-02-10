import { z } from "zod";

/** Zod schema for structured git status output including branch, staged, modified, and untracked files. */
export const GitStatusSchema = z.object({
  branch: z.string(),
  upstream: z.string().optional(),
  ahead: z.number().optional(),
  behind: z.number().optional(),
  staged: z.array(
    z.object({
      file: z.string(),
      status: z.enum(["added", "modified", "deleted", "renamed", "copied"]),
      oldFile: z.string().optional(),
    }),
  ),
  modified: z.array(z.string()),
  deleted: z.array(z.string()),
  untracked: z.array(z.string()),
  conflicts: z.array(z.string()),
  clean: z.boolean(),
});

export type GitStatus = z.infer<typeof GitStatusSchema>;

/** Zod schema for a single git log commit entry with hash, author, date, and message. */
export const GitLogEntrySchema = z.object({
  hash: z.string(),
  hashShort: z.string(),
  author: z.string(),
  email: z.string(),
  date: z.string(),
  message: z.string(),
  refs: z.string().optional(),
});

/** Zod schema for structured git log output containing an array of commits and total count. */
export const GitLogSchema = z.object({
  commits: z.array(GitLogEntrySchema),
  total: z.number(),
});

export type GitLog = z.infer<typeof GitLogSchema>;

/** Zod schema for a single file entry in a git diff with additions, deletions, and status. */
export const GitDiffFileSchema = z.object({
  file: z.string(),
  status: z.enum(["added", "modified", "deleted", "renamed"]),
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
});

/** Zod schema for structured git diff output with per-file stats and aggregate totals. */
export const GitDiffSchema = z.object({
  files: z.array(GitDiffFileSchema),
  totalAdditions: z.number(),
  totalDeletions: z.number(),
  totalFiles: z.number(),
});

export type GitDiff = z.infer<typeof GitDiffSchema>;

/** Zod schema for structured git branch output listing all branches and the current branch. */
export const GitBranchSchema = z.object({
  branches: z.array(
    z.object({
      name: z.string(),
      current: z.boolean(),
      upstream: z.string().optional(),
      lastCommit: z.string().optional(),
    }),
  ),
  current: z.string(),
});

export type GitBranch = z.infer<typeof GitBranchSchema>;

/** Zod schema for structured git show output with commit metadata and diff statistics. */
export const GitShowSchema = z.object({
  hash: z.string(),
  author: z.string(),
  email: z.string(),
  date: z.string(),
  message: z.string(),
  diff: z.object({
    files: z.array(GitDiffFileSchema),
    totalAdditions: z.number(),
    totalDeletions: z.number(),
    totalFiles: z.number(),
  }),
});

export type GitShow = z.infer<typeof GitShowSchema>;

/** Zod schema for structured git add output with count and list of staged files. */
export const GitAddSchema = z.object({
  staged: z.number(),
  files: z.array(z.string()),
});

export type GitAdd = z.infer<typeof GitAddSchema>;

/** Zod schema for structured git commit output with hash, message, and change statistics. */
export const GitCommitSchema = z.object({
  hash: z.string(),
  hashShort: z.string(),
  message: z.string(),
  filesChanged: z.number(),
  insertions: z.number(),
  deletions: z.number(),
});

export type GitCommit = z.infer<typeof GitCommitSchema>;

/** Zod schema for structured git push output with success status, remote, branch, and summary. */
export const GitPushSchema = z.object({
  success: z.boolean(),
  remote: z.string(),
  branch: z.string(),
  summary: z.string(),
});

export type GitPush = z.infer<typeof GitPushSchema>;

/** Zod schema for structured git pull output with success status, summary, change stats, and conflicts. */
export const GitPullSchema = z.object({
  success: z.boolean(),
  summary: z.string(),
  filesChanged: z.number(),
  insertions: z.number(),
  deletions: z.number(),
  conflicts: z.array(z.string()),
});

export type GitPull = z.infer<typeof GitPullSchema>;

/** Zod schema for structured git checkout output with ref, previous ref, and whether a new branch was created. */
export const GitCheckoutSchema = z.object({
  ref: z.string(),
  previousRef: z.string(),
  created: z.boolean(),
});

export type GitCheckout = z.infer<typeof GitCheckoutSchema>;
