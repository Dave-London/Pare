import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  shouldRegisterTool,
  isCoreToolForServer,
  registerDiscoverTool,
  type LazyToolManager,
} from "@paretools/shared";
import { registerPrViewTool } from "./pr-view.js";
import { registerPrListTool } from "./pr-list.js";
import { registerPrCreateTool } from "./pr-create.js";
import { registerPrMergeTool } from "./pr-merge.js";
import { registerPrCommentTool } from "./pr-comment.js";
import { registerPrReviewTool } from "./pr-review.js";
import { registerPrUpdateTool } from "./pr-update.js";
import { registerPrChecksTool } from "./pr-checks.js";
import { registerPrDiffTool } from "./pr-diff.js";
import { registerIssueViewTool } from "./issue-view.js";
import { registerIssueListTool } from "./issue-list.js";
import { registerIssueCreateTool } from "./issue-create.js";
import { registerIssueCloseTool } from "./issue-close.js";
import { registerIssueCommentTool } from "./issue-comment.js";
import { registerIssueUpdateTool } from "./issue-update.js";
import { registerRunViewTool } from "./run-view.js";
import { registerRunListTool } from "./run-list.js";
import { registerRunRerunTool } from "./run-rerun.js";
import { registerApiTool } from "./api.js";
import { registerReleaseCreateTool } from "./release-create.js";
import { registerGistCreateTool } from "./gist-create.js";
import { registerReleaseListTool } from "./release-list.js";
import { registerLabelListTool } from "./label-list.js";
import { registerLabelCreateTool } from "./label-create.js";
import { registerRepoViewTool } from "./repo-view.js";
import { registerRepoCloneTool } from "./repo-clone.js";
import { registerDiscussionListTool } from "./discussion-list.js";

const TOOL_DEFS: Array<{
  name: string;
  description: string;
  register: (server: McpServer) => void;
}> = [
  {
    name: "pr-view",
    description:
      "Views a pull request by number, URL, or branch. Returns structured data with state, checks, review decision, diff stats, author, labels, draft status, assignees, milestone, and timestamps.",
    register: registerPrViewTool,
  },
  {
    name: "pr-list",
    description:
      "Lists pull requests with optional filters. Returns structured list with PR number, state, title, author, branch, labels, draft status, and merge readiness.",
    register: registerPrListTool,
  },
  {
    name: "pr-create",
    description: "Creates a new pull request. Returns structured data with PR number and URL.",
    register: registerPrCreateTool,
  },
  {
    name: "pr-merge",
    description:
      "Merges a pull request by number, URL, or branch. Returns structured data with merge status, method, URL, and branch deletion status.",
    register: registerPrMergeTool,
  },
  {
    name: "pr-comment",
    description:
      "Adds, edits, or deletes a comment on a pull request. Returns structured data with the comment URL, operation type, comment ID, and body echo.",
    register: registerPrCommentTool,
  },
  {
    name: "pr-review",
    description:
      "Submits a review on a pull request (approve, request-changes, or comment). Returns structured data with the review event, URL, and body echo.",
    register: registerPrReviewTool,
  },
  {
    name: "pr-update",
    description:
      "Updates pull request metadata (title, body, labels, assignees, reviewers, milestone, base branch, projects). Returns structured data with PR number and URL.",
    register: registerPrUpdateTool,
  },
  {
    name: "pr-checks",
    description:
      "Lists check/status results for a pull request. Returns structured data with check names, states, URLs, and summary counts (passed, failed, pending).",
    register: registerPrChecksTool,
  },
  {
    name: "pr-diff",
    description:
      "Returns file-level diff statistics for a pull request. Use full=true for patch content.",
    register: registerPrDiffTool,
  },
  {
    name: "issue-view",
    description:
      "Views an issue by number or URL. Returns structured data with state, labels, assignees, author, milestone, close reason, and body.",
    register: registerIssueViewTool,
  },
  {
    name: "issue-list",
    description:
      "Lists issues with optional filters. Returns structured list with issue number, state, title, labels, assignees, author, creation date, and milestone.",
    register: registerIssueListTool,
  },
  {
    name: "issue-create",
    description:
      "Creates a new issue. Returns structured data with issue number, URL, and labels applied.",
    register: registerIssueCreateTool,
  },
  {
    name: "issue-close",
    description:
      "Closes an issue with an optional comment and reason. Returns structured data with issue number, state, URL, reason, and comment URL.",
    register: registerIssueCloseTool,
  },
  {
    name: "issue-comment",
    description:
      "Adds, edits, or deletes a comment on an issue. Returns structured data with the comment URL, operation type, comment ID, issue number, and body echo.",
    register: registerIssueCommentTool,
  },
  {
    name: "issue-update",
    description:
      "Updates issue metadata (title, body, labels, assignees, milestone, projects). Returns structured data with issue number and URL.",
    register: registerIssueUpdateTool,
  },
  {
    name: "run-view",
    description:
      "Views a workflow run by ID. Returns structured data with status, conclusion, jobs (with steps), and workflow details.",
    register: registerRunViewTool,
  },
  {
    name: "run-list",
    description:
      "Lists workflow runs with optional filters. Returns structured list with run ID, status, conclusion, and workflow details.",
    register: registerRunListTool,
  },
  {
    name: "run-rerun",
    description:
      "Re-runs a workflow run by ID. Optionally re-runs only failed jobs or a specific job. Returns structured result with run ID, status, and URL.",
    register: registerRunRerunTool,
  },
  {
    name: "release-create",
    description:
      "Creates a new GitHub release with optional asset uploads. Returns structured data with tag, URL, draft, prerelease status, and assets uploaded count.",
    register: registerReleaseCreateTool,
  },
  {
    name: "gist-create",
    description:
      "Creates a new GitHub gist from one or more files. Returns structured data with gist ID, URL, visibility, file names, description, and file count.",
    register: registerGistCreateTool,
  },
  {
    name: "release-list",
    description:
      "Lists GitHub releases for a repository. Returns structured list with tag, name, draft/prerelease/latest status, publish date, creation date, and URL.",
    register: registerReleaseListTool,
  },
  {
    name: "label-list",
    description:
      "Lists repository labels. Returns structured data with label name, description, color, and default status.",
    register: registerLabelListTool,
  },
  {
    name: "label-create",
    description:
      "Creates a new repository label. Returns structured data with label name, description, color, and URL.",
    register: registerLabelCreateTool,
  },
  {
    name: "repo-view",
    description:
      "Views repository details. Returns structured data with name, owner, description, stars, forks, languages, topics, license, and dates.",
    register: registerRepoViewTool,
  },
  {
    name: "repo-clone",
    description:
      "Clones a GitHub repository. Returns structured data with success status, repo name, target directory, and message.",
    register: registerRepoCloneTool,
  },
  {
    name: "discussion-list",
    description:
      "Lists GitHub Discussions for a repository via GraphQL. Returns structured list with discussion number, title, author, category, answered status, and comment count.",
    register: registerDiscussionListTool,
  },
  {
    name: "api",
    description:
      "Makes arbitrary GitHub API calls via `gh api`. Supports all HTTP methods, request bodies, field parameters, pagination, and jq filtering. Returns structured data with status, parsed JSON body, endpoint, and method.",
    register: registerApiTool,
  },
];

/** Registers all GitHub tools on the given MCP server, filtered by policy. */
export function registerAllTools(server: McpServer, lazyManager?: LazyToolManager) {
  const s = (name: string) => shouldRegisterTool("github", name);
  const isCore = (name: string) => isCoreToolForServer("github", name);

  for (const def of TOOL_DEFS) {
    if (!s(def.name)) continue;

    if (lazyManager && !isCore(def.name)) {
      lazyManager.registerLazy(def);
    } else {
      def.register(server);
    }
  }

  if (lazyManager && lazyManager.hasDeferredTools()) {
    registerDiscoverTool(server, lazyManager, "github");
  }
}
