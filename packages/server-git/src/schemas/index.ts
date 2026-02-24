import { z } from "zod";

/** Zod schema for structured git status output including branch, staged, modified, and untracked files. */
export const GitStatusSchema = z.object({
  branch: z.string(),
  porcelainVersion: z.enum(["v1", "v2"]).optional(),
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
  fullMessage: z.string().optional(),
  refs: z.string().optional(),
});

/** Zod schema for structured git log output containing an array of commits. */
export const GitLogSchema = z.object({
  commits: z.array(GitLogEntrySchema),
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

/** Zod schema for structured git diff output with per-file stats. */
export const GitDiffSchema = z.object({
  files: z.array(GitDiffFileSchema),
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
  objectType: z.enum(["commit", "tag", "tree", "blob", "unknown"]).optional(),
  objectName: z.string().optional(),
  objectSize: z.number().optional(),
  message: z.string(),
  diff: z
    .object({
      files: z.array(GitDiffFileSchema),
    })
    .optional(),
});

export type GitShow = z.infer<typeof GitShowSchema>;

/** Zod schema for a single staged file entry with file path and status. */
export const GitAddFileSchema = z.object({
  file: z.string(),
  status: z.enum(["added", "modified", "deleted"]),
});

/** Zod schema for structured git add output with list of staged files with per-file status. */
export const GitAddSchema = z.object({
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

/** Zod schema for structured git push output with success status and summary. */
export const GitPushSchema = z.object({
  success: z.boolean(),
  summary: z.string(),
  created: z.boolean().optional(),
  objectStats: z
    .object({
      total: z.number().optional(),
      delta: z.number().optional(),
      reused: z.number().optional(),
      packReused: z.number().optional(),
      bytes: z.number().optional(),
    })
    .optional(),
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

/** Zod schema for a file changed during a pull with optional line stats. */
export const GitPullChangedFileSchema = z.object({
  file: z.string(),
  insertions: z.number().optional(),
  deletions: z.number().optional(),
});

/** Zod schema for structured git pull output with success status, summary, change stats, and conflicts. */
export const GitPullSchema = z.object({
  success: z.boolean(),
  summary: z.string(),
  filesChanged: z.number(),
  insertions: z.number(),
  deletions: z.number(),
  conflicts: z.array(z.string()),
  conflictFiles: z.array(z.string()).optional(),
  changedFiles: z.array(GitPullChangedFileSchema).optional(),
  upToDate: z.boolean().optional(),
  fastForward: z.boolean().optional(),
});

export type GitPull = z.infer<typeof GitPullSchema>;

/** Zod schema for structured git checkout output with previous ref and whether a new branch was created. */
export const GitCheckoutSchema = z.object({
  success: z.boolean(),
  previousRef: z.string(),
  created: z.boolean(),
  detached: z.boolean().optional(),
  modifiedFiles: z.array(z.string()).optional(),
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
  tagType: z.enum(["lightweight", "annotated"]).optional(),
});

/** Zod schema for structured git tag output with tag list, plus create/delete support. */
export const GitTagSchema = z.object({
  tags: z.union([z.array(GitTagEntrySchema), z.array(z.string())]).optional(),
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
  tags: Array<{
    name: string;
    date?: string;
    message?: string;
    tagType?: "lightweight" | "annotated";
  }>;
};

export type GitTag = z.infer<typeof GitTagSchema>;

/** Zod schema for a single stash entry with index, message, date, and optional content summary. */
export const GitStashEntrySchema = z.object({
  index: z.number(),
  message: z.string(),
  date: z.string(),
  branch: z.string().optional(),
  files: z.number().optional(),
  summary: z.string().optional(),
});

/** Zod schema for structured git stash list output with stash entries. */
export const GitStashListSchema = z.object({
  stashes: z.union([z.array(GitStashEntrySchema), z.array(z.string())]),
});

/** Full stash list data (always returned by parser, before compact projection). */
export type GitStashListFull = {
  stashes: Array<{
    index: number;
    message: string;
    date: string;
    branch?: string;
    files?: number;
    summary?: string;
  }>;
};

export type GitStashList = z.infer<typeof GitStashListSchema>;

/** Zod schema for structured git stash push/pop/apply/drop/clear/show output. */
export const GitStashSchema = z.object({
  success: z.boolean(),
  message: z.string(),
  stashRef: z.string().optional(),
  branchName: z.string().optional(),
  reason: z.string().optional(),
  conflictFiles: z.array(z.string()).optional(),
  diffStat: z
    .object({
      filesChanged: z.number(),
      insertions: z.number(),
      deletions: z.number(),
      files: z
        .array(
          z.object({
            file: z.string(),
            insertions: z.number().optional(),
            deletions: z.number().optional(),
          }),
        )
        .optional(),
    })
    .optional(),
  patch: z.string().optional(),
});

export type GitStash = z.infer<typeof GitStashSchema>;

/** Zod schema for a single remote entry with name, fetch URL, and push URL. */
export const GitRemoteEntrySchema = z.object({
  name: z.string(),
  fetchUrl: z.string(),
  pushUrl: z.string(),
  protocol: z.enum(["ssh", "https", "http", "git", "file", "unknown"]).optional(),
  trackedBranches: z.array(z.string()).optional(),
});

/** Zod schema for structured git remote output with remote list, plus add/remove/rename/set-url/prune/show support. */
export const GitRemoteSchema = z.object({
  remotes: z.union([z.array(GitRemoteEntrySchema), z.array(z.string())]).optional(),
  /** Present for mutate actions. */
  success: z.boolean().optional(),
  /** Action performed (only present for mutate operations). */
  action: z.enum(["add", "remove", "rename", "set-url", "prune", "show", "update"]).optional(),
  /** Remote name (only present for mutate operations). */
  name: z.string().optional(),
  /** Remote URL (only present for add/set-url actions). */
  url: z.string().optional(),
  /** Human-readable message (only present for mutate operations). */
  message: z.string().optional(),
  /** Old remote name (only present for rename action). */
  oldName: z.string().optional(),
  /** New remote name (only present for rename action). */
  newName: z.string().optional(),
  /** Pruned branches (only present for prune action). */
  prunedBranches: z.array(z.string()).optional(),
  /** Remote show details (only present for show action). */
  showDetails: z
    .object({
      fetchUrl: z.string().optional(),
      pushUrl: z.string().optional(),
      headBranch: z.string().optional(),
      remoteBranches: z.array(z.string()).optional(),
      localBranches: z.array(z.string()).optional(),
    })
    .optional(),
});

/** Full remote data (always returned by parser, before compact projection). */
export type GitRemoteFull = {
  remotes: Array<{
    name: string;
    fetchUrl: string;
    pushUrl: string;
    protocol?: "ssh" | "https" | "http" | "git" | "file" | "unknown";
    trackedBranches?: string[];
  }>;
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
};

export type GitBlame = z.infer<typeof GitBlameSchema>;

/** Zod schema for structured git restore output with restored files, source ref, and staged flag. */
export const GitRestoreSchema = z.object({
  success: z.boolean().optional(),
  restored: z.array(z.string()),
  source: z.string(),
  staged: z.boolean(),
  errorType: z.enum(["pathspec", "unmerged", "invalid-source", "unknown"]).optional(),
  errorMessage: z.string().optional(),
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
  success: z.boolean().optional(),
  ref: z.string(),
  mode: z.enum(["soft", "mixed", "hard", "merge", "keep"]).optional(),
  previousRef: z.string().optional(),
  newRef: z.string().optional(),
  filesAffected: z.array(z.string()),
  errorType: z.enum(["invalid-ref", "pathspec", "incompatible-args", "unknown"]).optional(),
  errorMessage: z.string().optional(),
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
  state: z.enum(["completed", "conflict", "already-up-to-date", "fast-forward", "failed"]),
  fastForward: z.boolean(),
  branch: z.string(),
  mergeBase: z.string().optional(),
  conflicts: z.array(z.string()),
  commitHash: z.string().optional(),
  errorType: z
    .enum(["conflict", "local-changes", "unrelated-histories", "invalid-branch", "unknown"])
    .optional(),
  errorMessage: z.string().optional(),
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
  verified: z.boolean().optional(),
  verificationError: z.string().optional(),
});

export type GitRebase = z.infer<typeof GitRebaseSchema>;

/** Zod schema for a single log-graph commit entry with graph characters, hash, message, and refs. */
export const GitLogGraphEntrySchema = z.object({
  graph: z.string(),
  hashShort: z.string(),
  message: z.string(),
  parents: z.array(z.string()).optional(),
  refs: z.string().optional(),
  parsedRefs: z.array(z.string()).optional(),
  isMerge: z.boolean().optional(),
});

/** Zod schema for a compact log-graph commit entry with abbreviated keys. */
export const GitLogGraphCompactEntrySchema = z.object({
  g: z.string(),
  h: z.string(),
  m: z.string(),
  r: z.string().optional(),
});

/** Zod schema for structured git log --graph output with commits array. */
export const GitLogGraphSchema = z.object({
  commits: z.union([z.array(GitLogGraphEntrySchema), z.array(GitLogGraphCompactEntrySchema)]),
});

/** Full log-graph data (always returned by parser, before compact projection). */
export type GitLogGraphFull = {
  commits: Array<{
    graph: string;
    hashShort: string;
    message: string;
    parents?: string[];
    refs?: string;
    parsedRefs?: string[];
    isMerge?: boolean;
  }>;
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
  selectorIndex: z.number().optional(),
  action: z.enum(REFLOG_ACTIONS),
  rawAction: z.string(),
  description: z.string(),
  fromRef: z.string().optional(),
  toRef: z.string().optional(),
  date: z.string(),
});

/** Zod schema for structured git reflog output with entries array. */
export const GitReflogSchema = z.object({
  entries: z.union([z.array(GitReflogEntrySchema), z.array(z.string())]),
});

/** Full reflog data (always returned by parser, before compact projection). */
export type GitReflogFull = {
  entries: Array<{
    hash: string;
    shortHash: string;
    selector: string;
    selectorIndex?: number;
    action: ReflogAction;
    rawAction: string;
    description: string;
    fromRef?: string;
    toRef?: string;
    date: string;
  }>;
};

export type GitReflog = z.infer<typeof GitReflogSchema>;

/** Zod schema for structured git bisect output with action, current commit, remaining steps, and result. */
export const GitBisectSchema = z.object({
  action: z.enum(["start", "good", "bad", "reset", "status", "skip", "run", "replay"]),
  current: z.string().optional(),
  remaining: z.number().optional(),
  result: z
    .object({
      hash: z.string(),
      message: z.string(),
      author: z.string().optional(),
      date: z.string().optional(),
      filesChanged: z.array(z.string()).optional(),
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
};

export type GitWorktreeList = z.infer<typeof GitWorktreeListSchema>;

/** Zod schema for structured git worktree add/remove output. */
export const GitWorktreeSchema = z.object({
  success: z.boolean(),
  action: z.enum(["add", "remove", "lock", "unlock", "prune", "move", "repair"]).optional(),
  path: z.string(),
  targetPath: z.string().optional(),
  branch: z.string(),
  head: z.string().optional(),
});

export type GitWorktree = z.infer<typeof GitWorktreeSchema>;

/** Unified Zod schema for all worktree tool output (list + mutate actions).
 *  Uses a single z.object() with optional fields instead of z.union(),
 *  which is not supported by the MCP SDK for outputSchema. */
export const GitWorktreeOutputSchema = z.object({
  /** Present for list action. */
  worktrees: z.union([z.array(GitWorktreeEntrySchema), z.array(z.string())]).optional(),
  /** Present for mutate actions. */
  success: z.boolean().optional(),
  /** Action performed (only present for mutate operations). */
  action: z.enum(["add", "remove", "lock", "unlock", "prune", "move", "repair"]).optional(),
  /** Worktree path (present for mutate actions). */
  path: z.string().optional(),
  /** Target path (only present for move action). */
  targetPath: z.string().optional(),
  /** Branch name (present for mutate actions). */
  branch: z.string().optional(),
  /** HEAD commit (present for mutate actions). */
  head: z.string().optional(),
});

/** Type alias for remote mutate results (uses unified GitRemoteSchema). */
export type GitRemoteMutate = {
  success: boolean;
  action: "add" | "remove" | "rename" | "set-url" | "prune" | "show" | "update";
  name: string;
  url?: string;
  message: string;
  oldName?: string;
  newName?: string;
  prunedBranches?: string[];
  showDetails?: {
    fetchUrl?: string;
    pushUrl?: string;
    headBranch?: string;
    remoteBranches?: string[];
    localBranches?: string[];
  };
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

// ── Submodule ───────────────────────────────────────────────────────────

/** Zod schema for a single submodule entry with path, SHA, branch, and status. */
export const GitSubmoduleEntrySchema = z.object({
  path: z.string(),
  sha: z.string(),
  branch: z.string().optional(),
  status: z.enum(["up-to-date", "modified", "uninitialized"]),
});

/** Zod schema for structured git submodule output supporting list, add, update, sync, and deinit actions. */
export const GitSubmoduleSchema = z.object({
  action: z.enum(["list", "add", "update", "sync", "deinit"]),
  submodules: z.array(GitSubmoduleEntrySchema).optional(),
  success: z.boolean(),
  message: z.string(),
});

export type GitSubmoduleEntry = z.infer<typeof GitSubmoduleEntrySchema>;
export type GitSubmodule = z.infer<typeof GitSubmoduleSchema>;

// ── Archive ─────────────────────────────────────────────────────────────

/** Zod schema for structured git archive output with success status and message. */
export const GitArchiveSchema = z.object({
  success: z.boolean(),
  message: z.string(),
});

export type GitArchive = z.infer<typeof GitArchiveSchema>;

// ── Clean ───────────────────────────────────────────────────────────────

/** Zod schema for structured git clean output with file list and message. */
export const GitCleanSchema = z.object({
  files: z.array(z.string()),
  message: z.string(),
});

export type GitClean = z.infer<typeof GitCleanSchema>;

// ── Config ──────────────────────────────────────────────────────────────

/** Zod schema for a single config entry with key, value, and optional scope. */
export const GitConfigEntrySchema = z.object({
  key: z.string(),
  value: z.string(),
  scope: z.enum(["local", "global", "system", "worktree"]).optional(),
});

/** Zod schema for structured git config output supporting get, set, list, and unset actions. */
export const GitConfigSchema = z.object({
  action: z.enum(["get", "set", "list", "unset"]),
  entries: z.array(GitConfigEntrySchema).optional(),
  success: z.boolean(),
  message: z.string(),
});

export type GitConfigEntry = z.infer<typeof GitConfigEntrySchema>;
export type GitConfig = z.infer<typeof GitConfigSchema>;
