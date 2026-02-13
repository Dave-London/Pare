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
  hash: z.string().optional(),
  hashShort: z.string(),
  author: z.string().optional(),
  date: z.string().optional(),
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
});

/** Zod schema for structured git diff output with per-file stats and aggregate totals. */
export const GitDiffSchema = z.object({
  files: z.array(GitDiffFileSchema),
  totalAdditions: z.number().optional(),
  totalDeletions: z.number().optional(),
  totalFiles: z.number(),
});

export type GitDiff = z.infer<typeof GitDiffSchema>;

/** Zod schema for a full branch entry with tracking metadata. */
export const GitBranchEntrySchema = z.object({
  name: z.string(),
  current: z.boolean(),
  upstream: z.string().optional(),
  lastCommit: z.string().optional(),
});

/** Zod schema for structured git branch output listing all branches and the current branch. */
export const GitBranchSchema = z.object({
  branches: z.union([z.array(GitBranchEntrySchema), z.array(z.string())]),
  current: z.string(),
});

/** Full branch data (always returned by parser, before compact projection). */
export type GitBranchFull = {
  branches: Array<{ name: string; current: boolean; upstream?: string; lastCommit?: string }>;
  current: string;
};

export type GitBranch = z.infer<typeof GitBranchSchema>;

/** Zod schema for structured git show output with commit metadata and diff statistics. */
export const GitShowSchema = z.object({
  hash: z.string().optional(),
  hashShort: z.string().optional(),
  author: z.string().optional(),
  date: z.string().optional(),
  message: z.string(),
  diff: z
    .object({
      files: z.array(GitDiffFileSchema),
      totalAdditions: z.number().optional(),
      totalDeletions: z.number().optional(),
      totalFiles: z.number(),
    })
    .optional(),
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

/** Zod schema for a single tag entry with name, optional date, and optional message. */
export const GitTagEntrySchema = z.object({
  name: z.string(),
  date: z.string().optional(),
  message: z.string().optional(),
});

/** Zod schema for structured git tag output with tag list and total count. */
export const GitTagSchema = z.object({
  tags: z.union([z.array(GitTagEntrySchema), z.array(z.string())]),
  total: z.number(),
});

/** Full tag data (always returned by parser, before compact projection). */
export type GitTagFull = {
  tags: Array<{ name: string; date?: string; message?: string }>;
  total: number;
};

export type GitTag = z.infer<typeof GitTagSchema>;

/** Zod schema for a single stash entry with index, message, and date. */
export const GitStashEntrySchema = z.object({
  index: z.number(),
  message: z.string(),
  date: z.string(),
});

/** Zod schema for structured git stash list output with stash entries and total count. */
export const GitStashListSchema = z.object({
  stashes: z.union([z.array(GitStashEntrySchema), z.array(z.string())]),
  total: z.number(),
});

/** Full stash list data (always returned by parser, before compact projection). */
export type GitStashListFull = {
  stashes: Array<{ index: number; message: string; date: string }>;
  total: number;
};

export type GitStashList = z.infer<typeof GitStashListSchema>;

/** Zod schema for structured git stash push/pop/apply/drop output. */
export const GitStashSchema = z.object({
  action: z.enum(["push", "pop", "apply", "drop"]),
  success: z.boolean(),
  message: z.string(),
});

export type GitStash = z.infer<typeof GitStashSchema>;

/** Zod schema for a single remote entry with name, fetch URL, and push URL. */
export const GitRemoteEntrySchema = z.object({
  name: z.string(),
  fetchUrl: z.string(),
  pushUrl: z.string(),
});

/** Zod schema for structured git remote output with remote list and total count. */
export const GitRemoteSchema = z.object({
  remotes: z.union([z.array(GitRemoteEntrySchema), z.array(z.string())]),
  total: z.number(),
});

/** Full remote data (always returned by parser, before compact projection). */
export type GitRemoteFull = {
  remotes: Array<{ name: string; fetchUrl: string; pushUrl: string }>;
  total: number;
};

export type GitRemote = z.infer<typeof GitRemoteSchema>;

/** Zod schema for a blame commit group with metadata and its attributed lines. */
export const GitBlameCommitSchema = z.object({
  hash: z.string(),
  author: z.string(),
  date: z.string(),
  lines: z.array(z.object({ lineNumber: z.number(), content: z.string() })),
});

/** Zod schema for structured git blame output grouped by commit. */
export const GitBlameSchema = z.object({
  commits: z.union([
    z.array(GitBlameCommitSchema),
    z.array(z.object({ hash: z.string(), lines: z.array(z.number()) })),
  ]),
  file: z.string(),
  totalLines: z.number(),
});

/** Full blame data (always returned by parser, before compact projection). */
export type GitBlameFull = {
  commits: Array<{
    hash: string;
    author: string;
    date: string;
    lines: Array<{ lineNumber: number; content: string }>;
  }>;
  file: string;
  totalLines: number;
};

export type GitBlame = z.infer<typeof GitBlameSchema>;

/** Zod schema for structured git restore output with restored files, source ref, and staged flag. */
export const GitRestoreSchema = z.object({
  restored: z.array(z.string()),
  source: z.string(),
  staged: z.boolean(),
});

export type GitRestore = z.infer<typeof GitRestoreSchema>;

/** Zod schema for structured git reset output with ref and list of unstaged files. */
export const GitResetSchema = z.object({
  ref: z.string(),
  unstaged: z.array(z.string()),
});

export type GitReset = z.infer<typeof GitResetSchema>;
