import { z } from "zod";

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

export const GitLogEntrySchema = z.object({
  hash: z.string(),
  hashShort: z.string(),
  author: z.string(),
  email: z.string(),
  date: z.string(),
  message: z.string(),
  refs: z.string().optional(),
});

export const GitLogSchema = z.object({
  commits: z.array(GitLogEntrySchema),
  total: z.number(),
});

export type GitLog = z.infer<typeof GitLogSchema>;

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

export const GitDiffSchema = z.object({
  files: z.array(GitDiffFileSchema),
  totalAdditions: z.number(),
  totalDeletions: z.number(),
  totalFiles: z.number(),
});

export type GitDiff = z.infer<typeof GitDiffSchema>;

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
