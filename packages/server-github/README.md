# @paretools/github

[![npm](https://img.shields.io/npm/v/@paretools/github.svg)](https://www.npmjs.com/package/@paretools/github)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](https://github.com/Dave-London/Pare/blob/main/LICENSE)

**Structured, token-efficient GitHub operations for AI agents.** Wraps the [GitHub CLI](https://cli.github.com/) (`gh`) with typed JSON output.

Part of the [Pare](https://github.com/Dave-London/Pare) suite of MCP servers.

## Tools (8)

| Tool           | Description                                              |
| -------------- | -------------------------------------------------------- |
| `pr-view`      | View PR details with checks, review decision, diff stats |
| `pr-list`      | List PRs with state/author/label filters                 |
| `pr-create`    | Create a pull request with title, body, base/head        |
| `issue-view`   | View issue details with labels, assignees, body          |
| `issue-list`   | List issues with state/label/assignee filters            |
| `issue-create` | Create an issue with title, body, labels                 |
| `run-view`     | View workflow run details with job statuses              |
| `run-list`     | List workflow runs with branch/status filters            |

## Quick Start

```bash
npx -y @paretools/github
```

Add to your MCP client config:

```json
{
  "mcpServers": {
    "pare-github": {
      "command": "npx",
      "args": ["-y", "@paretools/github"]
    }
  }
}
```

## Example

**`pr-view` output:**

```json
{
  "number": 42,
  "state": "OPEN",
  "title": "Add search functionality",
  "mergeable": "MERGEABLE",
  "reviewDecision": "APPROVED",
  "checks": [{ "name": "CI", "status": "COMPLETED", "conclusion": "SUCCESS" }],
  "url": "https://github.com/owner/repo/pull/42",
  "headBranch": "feat/search",
  "baseBranch": "main",
  "additions": 150,
  "deletions": 20,
  "changedFiles": 5
}
```

## Prerequisites

- [GitHub CLI](https://cli.github.com/) (`gh`) installed and authenticated (`gh auth login`)

## Compatible Clients

Works with any MCP-compatible client: [Claude Code](https://docs.anthropic.com/en/docs/claude-code), [Claude Desktop](https://claude.ai/download), [Cursor](https://cursor.com), [Windsurf](https://codeium.com/windsurf), [VS Code / GitHub Copilot](https://code.visualstudio.com), [Cline](https://github.com/cline/cline), [Roo Code](https://roocode.com), [Zed](https://zed.dev), [Continue.dev](https://continue.dev), [Gemini CLI](https://github.com/google-gemini/gemini-cli), [OpenAI Codex](https://openai.com/index/codex/)

## Links

- [Pare monorepo](https://github.com/Dave-London/Pare)
- [MCP protocol](https://modelcontextprotocol.io)

## License

[MIT](https://github.com/Dave-London/Pare/blob/main/LICENSE)
