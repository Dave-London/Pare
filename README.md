<h1><img src="assets/logo.png" alt="" width="80" valign="middle" />&nbsp;&nbsp;Pare</h1>

[![CI](https://github.com/Dave-London/Pare/actions/workflows/ci.yml/badge.svg)](https://github.com/Dave-London/Pare/actions/workflows/ci.yml)
[![codecov](https://codecov.io/gh/Dave-London/Pare/graph/badge.svg)](https://codecov.io/gh/Dave-London/Pare)
[![npm](https://img.shields.io/npm/v/@paretools/git.svg?label=npm)](https://www.npmjs.com/package/@paretools/git)
[![Downloads](https://img.shields.io/npm/dm/@paretools/git.svg)](https://www.npmjs.com/package/@paretools/git)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-blue.svg)](https://www.typescriptlang.org/)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](https://github.com/Dave-London/Pare/blob/main/LICENSE)
[![Node.js >= 20](https://img.shields.io/badge/node-%3E%3D20-brightgreen.svg)](https://nodejs.org)
[![OpenSSF Scorecard](https://api.scorecard.dev/projects/github.com/Dave-London/Pare/badge)](https://scorecard.dev/viewer/?uri=github.com/Dave-London/Pare)
[![OpenSSF Best Practices](https://www.bestpractices.dev/projects/11962/badge)](https://www.bestpractices.dev/projects/11962)

**Dev tools for AI agents: 100% structured output, up to 90% fewer tokens.**

Pare provides [MCP](https://modelcontextprotocol.io) servers that wrap common developer tools (git, npm, docker, test runners, etc.) and return clean, schema-validated JSON instead of raw terminal text — letting AI coding agents consume tool output more efficiently and reliably.

## The Problem

AI agents often deal with CLI output meant for humans: ANSI colors, progress bars, verbose warnings, help text, and formatting. Parsing this reliably costs tokens and can lead to errors or fragile workarounds.

Here are some real examples of token usage:

| Tool Command                              | Raw Tokens | Pare Tokens | Reduction |
| ----------------------------------------- | ---------: | ----------: | --------: |
| `docker build` (multi-stage, 11 steps)    |        373 |          20 |   **95%** |
| `git log --stat` (5 commits, verbose)     |      4,992 |         382 |   **92%** |
| `npm install` (487 packages, warnings)    |        241 |          41 |   **83%** |
| `vitest run` (28 tests, all pass)         |        196 |          39 |   **80%** |
| `cargo build` (2 errors, help text)       |        436 |         138 |   **68%** |
| `pip install` (9 packages, progress bars) |        288 |         101 |   **65%** |
| `cargo test` (12 tests, 2 failures)       |        351 |         190 |   **46%** |
| `npm audit` (4 vulnerabilities)           |        287 |         185 |   **36%** |

> Token estimates use ~4 chars/token. The biggest savings appear on verbose commands (builds, installs, tests). For simpler tools like `eslint` or `tsc`, the main advantage is reliable structured data — agents can use typed JSON directly rather than parsing strings.

## How It Works

Each Pare tool returns two outputs:

- **`content`** — human-readable text, for MCP clients that display it
- **`structuredContent`** — typed, schema-validated JSON, ready for agents to process

This uses MCP's `structuredContent` and `outputSchema` features to provide type-safe, validated data that agents can rely on without custom parsing.

## Available Servers (149 tools, 16 packages)

| Package                                             | Tools                                                                                                                                                                                                                                                      | Wraps                                                            |
| --------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| [`@paretools/git`](./packages/server-git)           | status, log, diff, branch, show, add, commit, push, pull, checkout, tag, stash-list, stash, remote, blame, log-graph, restore, reset, cherry-pick, merge, rebase, reflog, bisect, worktree                                                                 | git                                                              |
| [`@paretools/github`](./packages/server-github)     | pr-view, pr-list, pr-create, pr-merge, pr-comment, pr-review, pr-update, pr-checks, pr-diff, issue-view, issue-list, issue-create, issue-close, issue-comment, issue-update, run-view, run-list, run-rerun, api, release-create, release-list, gist-create | gh                                                               |
| [`@paretools/search`](./packages/server-search)     | search, find, count, jq                                                                                                                                                                                                                                    | ripgrep, fd, jq                                                  |
| [`@paretools/test`](./packages/server-test)         | run, coverage, playwright                                                                                                                                                                                                                                  | pytest, jest, vitest, mocha, playwright                          |
| [`@paretools/npm`](./packages/server-npm)           | install, audit, outdated, list, run, test, init, info, search, nvm                                                                                                                                                                                         | npm, nvm                                                         |
| [`@paretools/docker`](./packages/server-docker)     | ps, build, logs, images, run, exec, compose-up, compose-down, pull, inspect, network-ls, volume-ls, compose-ps, compose-logs, compose-build, stats                                                                                                         | docker, docker compose                                           |
| [`@paretools/build`](./packages/server-build)       | tsc, build, esbuild, vite-build, webpack, turbo, nx                                                                                                                                                                                                        | tsc, esbuild, vite, webpack, turbo, nx                           |
| [`@paretools/lint`](./packages/server-lint)         | lint, format-check, prettier-format, biome-check, biome-format, stylelint, oxlint, shellcheck, hadolint                                                                                                                                                    | eslint, prettier, biome, stylelint, oxlint, shellcheck, hadolint |
| [`@paretools/http`](./packages/server-http)         | request, get, post, head                                                                                                                                                                                                                                   | curl                                                             |
| [`@paretools/make`](./packages/server-make)         | run, list                                                                                                                                                                                                                                                  | make, just                                                       |
| [`@paretools/python`](./packages/server-python)     | pip-install, mypy, ruff-check, pip-audit, pytest, uv-install, uv-run, black, pip-list, pip-show, ruff-format, conda, pyenv, poetry                                                                                                                         | pip, mypy, ruff, pytest, uv, black, conda, pyenv, poetry         |
| [`@paretools/cargo`](./packages/server-cargo)       | build, test, clippy, run, add, remove, fmt, doc, check, update, tree, audit                                                                                                                                                                                | cargo                                                            |
| [`@paretools/go`](./packages/server-go)             | build, test, vet, run, mod-tidy, fmt, generate, env, list, get, golangci-lint                                                                                                                                                                              | go, gofmt, golangci-lint                                         |
| [`@paretools/security`](./packages/server-security) | trivy, semgrep, gitleaks                                                                                                                                                                                                                                   | trivy, semgrep, gitleaks                                         |
| [`@paretools/k8s`](./packages/server-k8s)           | kubectl-get, kubectl-describe, kubectl-logs, kubectl-apply, helm                                                                                                                                                                                           | kubectl, helm                                                    |
| [`@paretools/process`](./packages/server-process)   | run                                                                                                                                                                                                                                                        | child_process                                                    |

## Quick Start

**Claude Code:**

```bash
claude mcp add --transport stdio pare-git -- npx -y @paretools/git
claude mcp add --transport stdio pare-test -- npx -y @paretools/test
```

**Claude Code / Claude Desktop / Cursor / Windsurf / Cline / Roo Code / Gemini CLI** (`mcpServers` format):

```json
{
  "mcpServers": {
    "pare-git": {
      "command": "npx",
      "args": ["-y", "@paretools/git"]
    },
    "pare-test": {
      "command": "npx",
      "args": ["-y", "@paretools/test"]
    }
  }
}
```

<details>
<summary><strong>VS Code / GitHub Copilot</strong> (<code>.vscode/mcp.json</code>)</summary>

```json
{
  "servers": {
    "pare-git": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "@paretools/git"]
    },
    "pare-test": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "@paretools/test"]
    }
  }
}
```

</details>

<details>
<summary><strong>Zed</strong> (<code>settings.json</code>)</summary>

```json
{
  "context_servers": {
    "pare-git": {
      "command": "npx",
      "args": ["-y", "@paretools/git"],
      "env": {}
    }
  }
}
```

</details>

<details>
<summary><strong>OpenAI Codex</strong> (<code>.codex/config.toml</code>)</summary>

```toml
[mcp_servers.pare-git]
command = "npx"
args = ["-y", "@paretools/git"]

[mcp_servers.pare-test]
command = "npx"
args = ["-y", "@paretools/test"]
```

</details>

<details>
<summary><strong>Continue.dev</strong> (<code>.continue/mcpServers/pare.yaml</code>)</summary>

```yaml
name: Pare Tools
version: 0.0.1
schema: v1
mcpServers:
  - name: pare-git
    type: stdio
    command: npx
    args: ["-y", "@paretools/git"]
  - name: pare-test
    type: stdio
    command: npx
    args: ["-y", "@paretools/test"]
```

</details>

<details>
<summary><strong>Windows (all JSON clients)</strong></summary>

On Windows, wrap `npx` with `cmd /c`:

```json
{
  "mcpServers": {
    "pare-git": {
      "command": "cmd",
      "args": ["/c", "npx", "-y", "@paretools/git"]
    }
  }
}
```

</details>

## Example: `git status`

**Raw git output (~118 tokens):**

```
On branch main
Your branch is ahead of 'origin/main' by 2 commits.
  (use "git push" to publish your local commits)

Changes to be committed:
  (use "git restore --staged <file>..." to unstage)
        modified:   src/index.ts
        new file:   src/utils.ts

Changes not staged for commit:
  (use "git add <file>..." to update what will be committed)
  (use "git restore <file>..." to discard changes in working directory)
        modified:   README.md

Untracked files:
  (use "git add <file>..." to include in what will be committed)
        temp.log
```

**Pare structured output (~59 tokens):**

```json
{
  "branch": "main",
  "upstream": "origin/main",
  "ahead": 2,
  "staged": [
    { "file": "src/index.ts", "status": "modified" },
    { "file": "src/utils.ts", "status": "added" }
  ],
  "modified": ["README.md"],
  "deleted": [],
  "untracked": ["temp.log"],
  "conflicts": [],
  "clean": false
}
```

50% fewer tokens. Zero information lost. Fully typed. Savings scale with output verbosity — test runners and build logs see 80–92% reduction.

> [!TIP]
> **[Tool Schemas](./docs/tool-schemas/)** — detailed response examples and token comparisons for every tool.

## Telling Agents to Use Pare

Add a snippet to your project's agent instruction file so AI agents prefer Pare tools over raw CLI commands:

<details>
<summary><strong>CLAUDE.md</strong> (Claude Code)</summary>

```markdown
## MCP Tools

When Pare MCP tools are available (prefixed with mcp\_\_pare-\*), prefer them over
running raw CLI commands via Bash. Pare tools return structured JSON with ~85%
fewer tokens than CLI output.

- Git: mcp**pare-git**status, log, diff, branch, show, add, commit, push, pull, checkout, tag, stash-list, stash, remote, blame
- GitHub: mcp**pare-github**pr-view, pr-list, pr-create, issue-view, issue-list, issue-create, run-view, run-list
- Search: mcp**pare-search**search, find, count
- Tests: mcp**pare-test**run, mcp**pare-test**coverage (pytest, jest, vitest, mocha)
- Builds: mcp**pare-build**tsc, build, esbuild, vite-build, webpack
- Linting: mcp**pare-lint**lint, format-check, prettier-format, biome-check, biome-format, stylelint, oxlint
- npm: mcp**pare-npm**install, audit, outdated, list, run, test, init, info, search
- Docker: mcp**pare-docker**ps, build, logs, images, run, exec, compose-up, compose-down, pull, inspect, network-ls, volume-ls, compose-ps
- HTTP: mcp**pare-http**request, get, post, head
- Make: mcp**pare-make**run, list
- Python: mcp**pare-python**pip-install, mypy, ruff-check, pip-audit, pytest, uv-install, uv-run, black, pip-list, pip-show, ruff-format
- Cargo: mcp**pare-cargo**build, test, clippy, run, add, remove, fmt, doc, check, update, tree
- Go: mcp**pare-go**build, test, vet, run, mod-tidy, fmt, generate, env, list, get
```

</details>

<details>
<summary><strong>AGENTS.md</strong> (OpenAI Codex, Gemini CLI, Claude Code)</summary>

```markdown
## MCP Servers

This project uses Pare MCP servers (149 tools) for structured, token-efficient dev tool output.
Prefer Pare MCP tools over raw CLI commands for git, testing, building, linting, npm, docker, python, cargo, and go.
Pare tools return typed JSON, saving tokens and preventing parsing errors.
```

</details>

<details>
<summary><strong>.cursor/rules/pare.mdc</strong> (Cursor)</summary>

```markdown
---
description: Use Pare MCP tools for structured dev tool output
globs: ["**/*"]
alwaysApply: true
---

When Pare MCP tools are available, prefer them over running CLI commands in the
terminal. Pare tools (pare-git, pare-test, pare-build, pare-lint, pare-npm,
pare-docker, pare-python, pare-cargo, pare-go, pare-github, pare-search, pare-http, pare-make — 149 tools total) return
structured JSON with up to 95% fewer tokens than raw CLI output.
```

</details>

<details>
<summary><strong>.github/copilot-instructions.md</strong> (GitHub Copilot)</summary>

```markdown
## Tool Preferences

This project uses Pare MCP servers (@paretools/\*) for structured dev tool output.
When available, prefer Pare tools (pare-git, pare-github, pare-search, pare-test, pare-build, pare-lint, pare-npm, pare-docker, pare-http, pare-make, pare-python, pare-cargo, pare-go) over raw CLI commands.
```

</details>

<details>
<summary><strong>GEMINI.md / .windsurfrules / .clinerules / .amazonq/rules/</strong></summary>

```markdown
When Pare MCP tools are available, prefer them over raw CLI commands.
Pare tools return structured JSON with fewer tokens than CLI output.

- pare-git: status, log, diff, branch, show, add, commit, push, pull, checkout, tag, stash-list, stash, remote, blame
- pare-github: pr-view, pr-list, pr-create, issue-view, issue-list, issue-create, run-view, run-list
- pare-search: search, find, count (ripgrep + fd)
- pare-test: run, coverage (pytest, jest, vitest, mocha)
- pare-build: tsc, build, esbuild, vite-build, webpack
- pare-lint: lint, format-check, prettier-format, biome-check, biome-format, stylelint, oxlint
- pare-npm: install, audit, outdated, list, run, test, init, info, search
- pare-docker: ps, build, logs, images, run, exec, compose-up, compose-down, pull, inspect, network-ls, volume-ls, compose-ps
- pare-http: request, get, post, head
- pare-make: run, list (make + just)
- pare-python: pip-install, mypy, ruff-check, pip-audit, pytest, uv-install, uv-run, black, pip-list, pip-show, ruff-format
- pare-cargo: build, test, clippy, run, add, remove, fmt, doc, check, update, tree
- pare-go: build, test, vet, run, mod-tidy, fmt, generate, env, list, get
```

</details>

## Configuration

### Tool Selection

By default, every Pare server registers all of its tools. If a server exposes tools you don't need — or you want to limit which tools are available to an agent — you can filter them with environment variables.

**Per-server filter** — restrict a single server's tools:

```bash
# Only register status and log in the git server
PARE_GIT_TOOLS=status,log npx @paretools/git
```

**Universal filter** — restrict tools across all servers:

```bash
# Only register these specific tools across any server
PARE_TOOLS=git:status,git:log,npm:install npx @paretools/git
```

**Disable all tools** — set the env var to an empty string:

```bash
PARE_GIT_TOOLS= npx @paretools/git   # no tools registered
```

| Env Var               | Scope       | Format            | Example                  |
| --------------------- | ----------- | ----------------- | ------------------------ |
| `PARE_TOOLS`          | All servers | `server:tool,...` | `git:status,npm:install` |
| `PARE_{SERVER}_TOOLS` | One server  | `tool,...`        | `status,log,diff`        |

**Rules:**

- No env var = all tools enabled (default)
- `PARE_TOOLS` (universal) takes precedence over per-server vars
- Server names use uppercase with hyphens replaced by underscores (e.g., `PARE_MY_SERVER_TOOLS`)
- Whitespace around commas is ignored

**Common patterns:**

```bash
# Read-only git (no push, commit, add, checkout)
PARE_GIT_TOOLS=status,log,diff,branch,show

# Minimal npm
PARE_NPM_TOOLS=install,test,run

# Only specific tools across all servers
PARE_TOOLS=git:status,git:diff,npm:install,test:run
```

In JSON MCP config, set via the `env` key:

```json
{
  "mcpServers": {
    "pare-git": {
      "command": "npx",
      "args": ["-y", "@paretools/git"],
      "env": {
        "PARE_GIT_TOOLS": "status,log,diff,show"
      }
    }
  }
}
```

## Troubleshooting

| Issue                               | Solution                                                                                            |
| ----------------------------------- | --------------------------------------------------------------------------------------------------- |
| `npx` not found / ENOENT on Windows | Use `cmd /c npx` wrapper (see Windows config above)                                                 |
| Slow first start                    | Run `npx -y @paretools/git` once to cache, or install globally: `npm i -g @paretools/git`           |
| Node.js version error               | Pare requires Node.js >= 20                                                                         |
| NVM/fnm PATH issues                 | Use absolute path to `npx`: e.g., `~/.nvm/versions/node/v22/bin/npx`                                |
| MCP connection timeout              | Set `MCP_TIMEOUT=30000` for Claude Code, or increase `initTimeout` in client config                 |
| Too many tools filling context      | Use [tool selection](#tool-selection) env vars to limit tools, or only install the servers you need |

## Contributing

Each server is a self-contained package. See [CONTRIBUTING.md](./CONTRIBUTING.md) for the full guide.

## License

[MIT](./LICENSE)
