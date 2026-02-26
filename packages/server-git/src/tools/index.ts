import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  shouldRegisterTool,
  isCoreToolForServer,
  registerDiscoverTool,
  type LazyToolManager,
} from "@paretools/shared";
import { registerStatusTool } from "./status.js";
import { registerLogTool } from "./log.js";
import { registerDiffTool } from "./diff.js";
import { registerBranchTool } from "./branch.js";
import { registerShowTool } from "./show.js";
import { registerAddTool } from "./add.js";
import { registerCommitTool } from "./commit.js";
import { registerPushTool } from "./push.js";
import { registerPullTool } from "./pull.js";
import { registerCheckoutTool } from "./checkout.js";
import { registerTagTool } from "./tag.js";
import { registerStashListTool } from "./stash-list.js";
import { registerStashTool } from "./stash.js";
import { registerRemoteTool } from "./remote.js";
import { registerBlameTool } from "./blame.js";
import { registerRestoreTool } from "./restore.js";
import { registerResetTool } from "./reset.js";
import { registerCherryPickTool } from "./cherry-pick.js";
import { registerMergeTool } from "./merge.js";
import { registerRebaseTool } from "./rebase.js";
import { registerLogGraphTool } from "./log-graph.js";
import { registerReflogTool } from "./reflog.js";
import { registerBisectTool } from "./bisect.js";
import { registerWorktreeTool } from "./worktree.js";
import { registerSubmoduleTool } from "./submodule.js";
import { registerArchiveTool } from "./archive.js";
import { registerCleanTool } from "./clean.js";
import { registerConfigTool } from "./config.js";

/**
 * Tool metadata used for lazy registration — maps tool name to its
 * description and registration function.
 */
const TOOL_DEFS: Array<{
  name: string;
  description: string;
  register: (server: McpServer) => void;
}> = [
  {
    name: "status",
    description:
      "Returns the working tree status as structured data (branch, staged, modified, untracked, conflicts).",
    register: registerStatusTool,
  },
  {
    name: "log",
    description: "Returns commit history as structured data.",
    register: registerLogTool,
  },
  {
    name: "log-graph",
    description:
      "Returns visual branch topology as structured data. Wraps `git log --graph --oneline --decorate`.",
    register: registerLogGraphTool,
  },
  {
    name: "diff",
    description:
      "Returns file-level diff statistics as structured data. Use full=true for patch content.",
    register: registerDiffTool,
  },
  {
    name: "branch",
    description: "Lists, creates, renames, or deletes branches. Returns structured branch data.",
    register: registerBranchTool,
  },
  {
    name: "show",
    description: "Shows commit details and diff statistics for a given ref.",
    register: registerShowTool,
  },
  {
    name: "add",
    description:
      "Stages files for commit. Returns structured data with count and list of staged files, including how many were newly staged.",
    register: registerAddTool,
  },
  {
    name: "commit",
    description:
      "Creates a commit with the given message. Returns structured data with hash, message, and change statistics.",
    register: registerCommitTool,
  },
  {
    name: "push",
    description:
      "Pushes commits to a remote repository. Returns structured data with success status, remote, branch, summary, and whether the remote branch was newly created.",
    register: registerPushTool,
  },
  {
    name: "pull",
    description:
      "Pulls changes from a remote repository. Returns structured data with success status, summary, change statistics, conflicts, up-to-date and fast-forward indicators.",
    register: registerPullTool,
  },
  {
    name: "checkout",
    description:
      "Switches branches or restores files. Returns structured data with ref, previous ref, whether a new branch was created, and detached HEAD status.",
    register: registerCheckoutTool,
  },
  {
    name: "tag",
    description:
      "Manages git tags. Supports list (default), create, and delete actions. List returns structured tag data with name, date, and message. Create supports lightweight and annotated tags.",
    register: registerTagTool,
  },
  {
    name: "stash-list",
    description:
      "Lists all stash entries with index, message, date, branch, and optional file change summary. Returns structured stash data.",
    register: registerStashListTool,
  },
  {
    name: "stash",
    description:
      "Pushes, pops, applies, drops, shows, or clears stash entries. Returns structured result with action, success, message, and stash reference.",
    register: registerStashTool,
  },
  {
    name: "remote",
    description:
      "Manages remote repositories. Supports list (default), add, remove, rename, set-url, prune, and show actions. Returns structured remote data.",
    register: registerRemoteTool,
  },
  {
    name: "blame",
    description:
      "Shows commit annotations for a file, grouped by commit. Returns structured blame data with deduplicated commit metadata (hash, author, email, date) and their attributed lines.",
    register: registerBlameTool,
  },
  {
    name: "restore",
    description:
      "Discards working tree changes or restores files from a specific commit. Returns structured data with restored files, source ref, and staged flag.",
    register: registerRestoreTool,
  },
  {
    name: "reset",
    description:
      "Resets the current HEAD to a specified state. Supports soft, mixed, hard, merge, and keep modes. The 'hard' mode requires confirm=true as a safety guard since it permanently discards changes. Returns structured data with the ref, mode, and list of affected files.",
    register: registerResetTool,
  },
  {
    name: "cherry-pick",
    description:
      "Applies specific commits to the current branch. Returns structured data with applied commits, any conflicts, and new commit hash.",
    register: registerCherryPickTool,
  },
  {
    name: "merge",
    description:
      "Merges a branch into the current branch. Supports abort, continue, and quit actions. Returns structured data with merge status, fast-forward detection, conflicts, and commit hash.",
    register: registerMergeTool,
  },
  {
    name: "rebase",
    description:
      "Rebases the current branch onto a target branch. Supports abort, continue, skip, and quit for conflict resolution. Returns structured data with success status, branch info, conflicts, and rebased commit count.",
    register: registerRebaseTool,
  },
  {
    name: "reflog",
    description:
      "Returns reference log entries as structured data, useful for recovery operations. Also supports checking if a reflog exists.",
    register: registerReflogTool,
  },
  {
    name: "bisect",
    description:
      "Binary search for the commit that introduced a bug. Returns structured data with action taken, current commit, remaining steps estimate, and result.",
    register: registerBisectTool,
  },
  {
    name: "worktree",
    description:
      "Lists, adds, removes, locks, unlocks, or prunes git worktrees for managing multiple working trees. Returns structured data with worktree paths, branches, and HEAD commits.",
    register: registerWorktreeTool,
  },
  {
    name: "submodule",
    description:
      "Manages git submodules. Supports list (default), add, update, sync, and deinit actions. List returns structured submodule data with path, SHA, branch, and status.",
    register: registerSubmoduleTool,
  },
  {
    name: "archive",
    description:
      "Creates an archive of files from a git repository. Supports tar, tar.gz, and zip formats. Returns structured data with success status, format, output file, and treeish.",
    register: registerArchiveTool,
  },
  {
    name: "clean",
    description:
      "Removes untracked files from the working tree. DEFAULTS TO DRY-RUN MODE for safety — shows what would be removed without actually deleting. Set force=true AND dryRun=false to actually remove files.",
    register: registerCleanTool,
  },
  {
    name: "config",
    description:
      "Manages git configuration values. Supports get, set, list, and unset actions. Operates at local, global, system, or worktree scope.",
    register: registerConfigTool,
  },
];

/** Registers all git tools on the given MCP server, filtered by policy. */
export function registerAllTools(server: McpServer, lazyManager?: LazyToolManager) {
  const s = (name: string) => shouldRegisterTool("git", name);
  const isCore = (name: string) => isCoreToolForServer("git", name);

  for (const def of TOOL_DEFS) {
    if (!s(def.name)) continue;

    if (lazyManager && !isCore(def.name)) {
      lazyManager.registerLazy(def);
    } else {
      def.register(server);
    }
  }

  if (lazyManager && lazyManager.hasDeferredTools()) {
    registerDiscoverTool(server, lazyManager, "git");
  }
}
