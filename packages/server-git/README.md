# @paretools/git

[![npm](https://img.shields.io/npm/v/@paretools/git.svg)](https://www.npmjs.com/package/@paretools/git)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](https://github.com/Dave-London/Pare/blob/main/LICENSE)

**Structured, token-efficient git output for AI agents.** Up to 92% fewer tokens than raw `git` CLI output.

Part of the [Pare](https://github.com/Dave-London/Pare) suite of MCP servers.

## Tools (10)

| Tool       | Description                                                          |
| ---------- | -------------------------------------------------------------------- |
| `status`   | Working tree status (branch, staged, modified, untracked, conflicts) |
| `log`      | Commit history as structured data                                    |
| `diff`     | File-level diff stats, optional full patch content                   |
| `branch`   | List, create, or delete branches                                     |
| `show`     | Commit details and diff stats for a given ref                        |
| `add`      | Stage files for commit                                               |
| `commit`   | Create a commit with structured result (hash, stats)                 |
| `push`     | Push commits to a remote repository                                  |
| `pull`     | Pull changes from a remote with conflict detection                   |
| `checkout` | Switch branches or restore files                                     |

## Quick Start

```bash
npx -y @paretools/git
```

Add to your MCP client config:

```json
{
  "mcpServers": {
    "pare-git": {
      "command": "npx",
      "args": ["-y", "@paretools/git"]
    }
  }
}
```

## Example

**`status` output:**

```json
{
  "branch": "main",
  "upstream": "origin/main",
  "ahead": 2,
  "staged": [{ "file": "src/index.ts", "status": "modified" }],
  "modified": ["README.md"],
  "untracked": ["temp.log"],
  "clean": false
}
```

## All Pare Servers (62 tools)

| Package                                                              | Tools                                                                       | Wraps                              |
| -------------------------------------------------------------------- | --------------------------------------------------------------------------- | ---------------------------------- |
| **@paretools/git**                                                   | status, log, diff, branch, show, add, commit, push, pull, checkout          | git                                |
| [@paretools/test](https://www.npmjs.com/package/@paretools/test)     | run, coverage                                                               | pytest, jest, vitest, mocha        |
| [@paretools/npm](https://www.npmjs.com/package/@paretools/npm)       | install, audit, outdated, list, run, test, init                             | npm                                |
| [@paretools/build](https://www.npmjs.com/package/@paretools/build)   | tsc, build, esbuild, vite-build, webpack                                    | tsc, esbuild, vite, webpack        |
| [@paretools/lint](https://www.npmjs.com/package/@paretools/lint)     | lint, format-check, prettier-format, biome-check, biome-format              | eslint, prettier, biome            |
| [@paretools/python](https://www.npmjs.com/package/@paretools/python) | pip-install, mypy, ruff-check, pip-audit, pytest, uv-install, uv-run, black | pip, mypy, ruff, pytest, uv, black |
| [@paretools/docker](https://www.npmjs.com/package/@paretools/docker) | ps, build, logs, images, run, exec, compose-up, compose-down, pull          | docker, docker compose             |
| [@paretools/cargo](https://www.npmjs.com/package/@paretools/cargo)   | build, test, clippy, run, add, remove, fmt, doc, check                      | cargo                              |
| [@paretools/go](https://www.npmjs.com/package/@paretools/go)         | build, test, vet, run, mod-tidy, fmt, generate                              | go, gofmt                          |

## Compatible Clients

Works with any MCP-compatible client: [Claude Code](https://docs.anthropic.com/en/docs/claude-code), [Claude Desktop](https://claude.ai/download), [Cursor](https://cursor.com), [Windsurf](https://codeium.com/windsurf), [VS Code / GitHub Copilot](https://code.visualstudio.com), [Cline](https://github.com/cline/cline), [Roo Code](https://roocode.com), [Zed](https://zed.dev), [Continue.dev](https://continue.dev), [Gemini CLI](https://github.com/google-gemini/gemini-cli), [OpenAI Codex](https://openai.com/index/codex/)

## Links

- [Pare monorepo](https://github.com/Dave-London/Pare)
- [MCP protocol](https://modelcontextprotocol.io)

## License

[MIT](https://github.com/Dave-London/Pare/blob/main/LICENSE)
