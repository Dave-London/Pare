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
  binary: z.boolean().optional(),
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

/** Zod schema for a single staged file entry with file path and status. */
export const GitAddFileSchema = z.object({
  file: z.string(),
  status: z.enum(["added", "modified", "deleted"]),
});

/** Zod schema for structured git add output with count and list of staged files with per-file status. */
export const GitAddSchema = z.object({
  staged: z.number(),
  files: z.array(GitAddFileSchema),
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
  created: z.boolean().optional(),
  errorType: z
    .enum([
      "rejected",
      "no-upstream",
      "permission-denied",
      "repository-not-found",
      "hook-declined",
      "unknown",
    ])
    .optional(),
  rejectedRef: z.string().optional(),
  hint: z.string().optional(),
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
  upToDate: z.boolean().optional(),
  fastForward: z.boolean().optional(),
});

export type GitPull = z.infer<typeof GitPullSchema>;

/** Zod schema for structured git checkout output with ref, previous ref, and whether a new branch was created. */
export const GitCheckoutSchema = z.object({
  success: z.boolean(),
  ref: z.string(),
  previousRef: z.string(),
  created: z.boolean(),
  detached: z.boolean().optional(),
  errorType: z
    .enum(["dirty-tree", "conflict", "invalid-ref", "already-exists", "unknown"])
    .optional(),
  conflictFiles: z.array(z.string()).optional(),
  errorMessage: z.string().optional(),
});

export type GitCheckout = z.infer<typeof GitCheckoutSchema>;

/** Zod schema for a single tag entry with name, optional date, and optional message. */
export const GitTagEntrySchema = z.object({
  name: z.string(),
  date: z.string().optional(),
  message: z.string().optional(),
});

/** Zod schema for structured git tag output with tag list and total count, plus create/delete support. */
export const GitTagSchema = z.object({
  tags: z.union([z.array(GitTagEntrySchema), z.array(z.string())]).optional(),
  total: z.number().optional(),
  /** Present for create/delete actions. */
  success: z.boolean().optional(),
  /** Action performed: create or delete (only present for mutate operations). */
  action: z.enum(["create", "delete"]).optional(),
  /** Tag name (only present for mutate operations). */
  name: z.string().optional(),
  /** Human-readable message (only present for mutate operations). */
  message: z.string().optional(),
  /** Commit ref (only present for create action with explicit commit). */
  commit: z.string().optional(),
  /** Whether the tag is annotated (only present for create action). */
  annotated: z.boolean().optional(),
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
  branch: z.string().optional(),
});

/** Zod schema for structured git stash list output with stash entries and total count. */
export const GitStashListSchema = z.object({
  stashes: z.union([z.array(GitStashEntrySchema), z.array(z.string())]),
  total: z.number(),
});

/** Full stash list data (always returned by parser, before compact projection). */
export type GitStashListFull = {
  stashes: Array<{ index: number; message: string; date: string; branch?: string }>;
  total: number;
};

export type GitStashList = z.infer<typeof GitStashListSchema>;

/** Zod schema for structured git stash push/pop/apply/drop/clear output. */
export const GitStashSchema = z.object({
  action: z.enum(["push", "pop", "apply", "drop", "clear"]),
  success: z.boolean(),
  message: z.string(),
  stashRef: z.string().optional(),
  reason: z.string().optional(),
  conflictFiles: z.array(z.string()).optional(),
});

export type GitStash = z.infer<typeof GitStashSchema>;

/** Zod schema for a single remote entry with name, fetch URL, and push URL. */
export const GitRemoteEntrySchema = z.object({
  name: z.string(),
  fetchUrl: z.string(),
  pushUrl: z.string(),
  protocol: z.enum(["ssh", "https", "http", "git", "file", "unknown"]).optional(),
});

/** Zod schema for structured git remote output with remote list and total count, plus add/remove support. */
export const GitRemoteSchema = z.object({
  remotes: z.union([z.array(GitRemoteEntrySchema), z.array(z.string())]).optional(),
  total: z.number().optional(),
  /** Present for add/remove actions. */
  success: z.boolean().optional(),
  /** Action performed: add or remove (only present for mutate operations). */
  action: z.enum(["add", "remove"]).optional(),
  /** Remote name (only present for mutate operations). */
  name: z.string().optional(),
  /** Remote URL (only present for add action). */
  url: z.string().optional(),
  /** Human-readable message (only present for mutate operations). */
  message: z.string().optional(),
});

/** Full remote data (always returned by parser, before compact projection). */
export type GitRemoteFull = {
  remotes: Array<{
    name: string;
    fetchUrl: string;
    pushUrl: string;
    protocol?: "ssh" | "https" | "http" | "git" | "file" | "unknown";
  }>;
  total: number;
};

export type GitRemote = z.infer<typeof GitRemoteSchema>;

/** Zod schema for a blame commit group with metadata and its attributed lines. */
export const GitBlameCommitSchema = z.object({
  hash: z.string(),
  author: z.string(),
  email: z.string().optional(),
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
    email?: string;
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
  verified: z.boolean().optional(),
  verifiedFiles: z
    .array(
      z.object({
        file: z.string(),
        restored: z.boolean(),
      }),
    )
    .optional(),
});

export type GitRestore = z.infer<typeof GitRestoreSchema>;

/** Zod schema for structured git reset output with ref, mode, and list of unstaged files. */
export const GitResetSchema = z.object({
  ref: z.string(),
  mode: z.enum(["soft", "mixed", "hard", "merge", "keep"]).optional(),
  previousRef: z.string().optional(),
  newRef: z.string().optional(),
  filesAffected: z.array(z.string()),
});

export type GitReset = z.infer<typeof GitResetSchema>;

/** Zod schema for structured git cherry-pick output with applied commits and conflict list. */
export const GitCherryPickSchema = z.object({
  success: z.boolean(),
  state: z.enum(["completed", "conflict", "in-progress"]),
  applied: z.array(z.string()),
  conflicts: z.array(z.string()),
  newCommitHash: z.string().optional(),
});

export type GitCherryPick = z.infer<typeof GitCherryPickSchema>;

/** Zod schema for structured git merge output with merge status, conflicts, and optional commit hash. */
export const GitMergeSchema = z.object({
  merged: z.boolean(),
  state: z.enum(["completed", "conflict", "already-up-to-date", "fast-forward"]),
  fastForward: z.boolean(),
  branch: z.string(),
  conflicts: z.array(z.string()),
  commitHash: z.string().optional(),
});

export type GitMerge = z.infer<typeof GitMergeSchema>;

/** Zod schema for structured git rebase output with success status, branch info, conflicts, and rebased commit count. */
export const GitRebaseSchema = z.object({
  success: z.boolean(),
  state: z.enum(["completed", "conflict", "in-progress"]),
  branch: z.string(),
  current: z.string(),
  conflicts: z.array(z.string()),
  rebasedCommits: z.number().optional(),
});

export type GitRebase = z.infer<typeof GitRebaseSchema>;

/** Zod schema for a single log-graph commit entry with graph characters, hash, message, and refs. */
export const GitLogGraphEntrySchema = z.object({
  graph: z.string(),
  hashShort: z.string(),
  message: z.string(),
  refs: z.string().optional(),
  isMerge: z.boolean().optional(),
});

/** Zod schema for a compact log-graph commit entry with abbreviated keys. */
export const GitLogGraphCompactEntrySchema = z.object({
  g: z.string(),
  h: z.string(),
  m: z.string(),
  r: z.string().optional(),
});

/** Zod schema for structured git log --graph output with commits array and total count. */
export const GitLogGraphSchema = z.object({
  commits: z.union([z.array(GitLogGraphEntrySchema), z.array(GitLogGraphCompactEntrySchema)]),
  total: z.number(),
});

/** Full log-graph data (always returned by parser, before compact projection). */
export type GitLogGraphFull = {
  commits: Array<{
    graph: string;
    hashShort: string;
    message: string;
    refs?: string;
    isMerge?: boolean;
  }>;
  total: number;
};

export type GitLogGraph = z.infer<typeof GitLogGraphSchema>;

/** Normalized reflog action values. */
export const REFLOG_ACTIONS = [
  "commit",
  "commit-initial",
  "commit-amend",
  "checkout",
  "merge",
  "rebase",
  "rebase-finish",
  "rebase-abort",
  "rebase-pick",
  "rebase-reword",
  "rebase-edit",
  "rebase-squash",
  "rebase-fixup",
  "pull",
  "reset",
  "branch",
  "clone",
  "cherry-pick",
  "stash",
  "other",
] as const;

export type ReflogAction = (typeof REFLOG_ACTIONS)[number];

/** Zod schema for a single reflog entry with hash, selector, action, description, and date. */
export const GitReflogEntrySchema = z.object({
  hash: z.string(),
  shortHash: z.string(),
  selector: z.string(),
  action: z.enum(REFLOG_ACTIONS),
  rawAction: z.string(),
  description: z.string(),
  date: z.string(),
});

/** Zod schema for structured git reflog output with entries array and total count. */
export const GitReflogSchema = z.object({
  entries: z.union([z.array(GitReflogEntrySchema), z.array(z.string())]),
  total: z.number(),
  totalAvailable: z.number().optional(),
});

/** Full reflog data (always returned by parser, before compact projection). */
export type GitReflogFull = {
  entries: Array<{
    hash: string;
    shortHash: string;
    selector: string;
    action: ReflogAction;
    rawAction: string;
    description: string;
    date: string;
  }>;
  total: number;
  totalAvailable?: number;
};

export type GitReflog = z.infer<typeof GitReflogSchema>;

/** Zod schema for structured git bisect output with action, current commit, remaining steps, and result. */
export const GitBisectSchema = z.object({
  action: z.enum(["start", "good", "bad", "reset", "status", "skip", "run"]),
  current: z.string().optional(),
  remaining: z.number().optional(),
  result: z
    .object({
      hash: z.string(),
      message: z.string(),
      author: z.string().optional(),
      date: z.string().optional(),
    })
    .optional(),
  message: z.string(),
  /** Command used for automated bisect run (only present for action=run). */
  command: z.string().optional(),
  /** Number of steps executed during bisect run (only present for action=run). */
  stepsRun: z.number().optional(),
});

export type GitBisect = z.infer<typeof GitBisectSchema>;

/** Zod schema for a single worktree entry with path, HEAD commit, branch, and bare flag. */
export const GitWorktreeEntrySchema = z.object({
  path: z.string(),
  head: z.string(),
  branch: z.string(),
  bare: z.boolean(),
  locked: z.boolean().optional(),
  lockReason: z.string().optional(),
  prunable: z.boolean().optional(),
});

/** Zod schema for structured git worktree list output. */
export const GitWorktreeListSchema = z.object({
  worktrees: z.union([z.array(GitWorktreeEntrySchema), z.array(z.string())]),
  total: z.number(),
});

/** Full worktree list data (always returned by parser, before compact projection). */
export type GitWorktreeListFull = {
  worktrees: Array<{
    path: string;
    head: string;
    branch: string;
    bare: boolean;
    locked?: boolean;
    lockReason?: string;
    prunable?: boolean;
  }>;
  total: number;
};

export type GitWorktreeList = z.infer<typeof GitWorktreeListSchema>;

/** Zod schema for structured git worktree add/remove output. */
export const GitWorktreeSchema = z.object({
  success: z.boolean(),
  path: z.string(),
  branch: z.string(),
  head: z.string().optional(),
});

export type GitWorktree = z.infer<typeof GitWorktreeSchema>;

/** Type alias for remote mutate results (uses unified GitRemoteSchema). */
export type GitRemoteMutate = {
  success: boolean;
  action: "add" | "remove";
  name: string;
  url?: string;
  message: string;
};

/** Type alias for tag mutate results (uses unified GitTagSchema). */
export type GitTagMutate = {
  success: boolean;
  action: "create" | "delete";
  name: string;
  message: string;
  commit?: string;
  annotated?: boolean;
};
