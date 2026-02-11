# Pare

[![CI](https://github.com/Dave-London/Pare/actions/workflows/ci.yml/badge.svg)](https://github.com/Dave-London/Pare/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/@paretools/git.svg?label=npm)](https://www.npmjs.com/package/@paretools/git)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](https://github.com/Dave-London/Pare/blob/main/LICENSE)
[![Node.js >= 20](https://img.shields.io/badge/node-%3E%3D20-brightgreen.svg)](https://nodejs.org)

**Dev tools, optimized for agents. Up to 95% fewer tokens, 100% structured output.**

Pare is a collection of [MCP](https://modelcontextprotocol.io) servers that wrap popular developer tools with structured, token-efficient, schema-validated output optimized for AI coding agents.

## The Problem

AI coding agents waste tokens on output designed for humans — ANSI colors, progress bars, download indicators, help suggestions, decorative formatting. This is expensive and error-prone to parse.

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

> Token counts estimated at ~4 chars/token. Savings are highest on verbose, human-formatted output — build logs, install progress, test runners, and detailed history. For compact diagnostic tools like `eslint` or `tsc` (one line per issue), Pare's value is structured reliability over token savings: agents get typed JSON they can consume directly instead of regex-parsing human text.

## How It Works

Every Pare tool returns dual output:

- **`content`** — Human-readable text (for MCP clients that display it)
- **`structuredContent`** — Typed, schema-validated JSON (for agents)

Pare uses MCP's `structuredContent` + `outputSchema` spec features to deliver type-safe, validated structured output that agents can consume directly.

## Available Servers (62 tools)

| Package                                         | Tools                                                                       | Wraps                              |
| ----------------------------------------------- | --------------------------------------------------------------------------- | ---------------------------------- |
| [`@paretools/git`](./packages/server-git)       | status, log, diff, branch, show, add, commit, push, pull, checkout          | git                                |
| [`@paretools/test`](./packages/server-test)     | run, coverage                                                               | pytest, jest, vitest, mocha        |
| [`@paretools/npm`](./packages/server-npm)       | install, audit, outdated, list, run, test, init                             | npm                                |
| [`@paretools/docker`](./packages/server-docker) | ps, build, logs, images, run, exec, compose-up, compose-down, pull          | docker, docker compose             |
| [`@paretools/build`](./packages/server-build)   | tsc, build, esbuild, vite-build, webpack                                    | tsc, esbuild, vite, webpack        |
| [`@paretools/lint`](./packages/server-lint)     | lint, format-check, prettier-format, biome-check, biome-format              | eslint, prettier, biome            |
| [`@paretools/python`](./packages/server-python) | pip-install, mypy, ruff-check, pip-audit, pytest, uv-install, uv-run, black | pip, mypy, ruff, pytest, uv, black |
| [`@paretools/cargo`](./packages/server-cargo)   | build, test, clippy, run, add, remove, fmt, doc, check                      | cargo                              |
| [`@paretools/go`](./packages/server-go)         | build, test, vet, run, mod-tidy, fmt, generate                              | go, gofmt                          |

## Quick Start

**Claude Code (recommended):**

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

## Telling Agents to Use Pare

Add a snippet to your project's agent instruction file so AI agents prefer Pare tools over raw CLI commands:

<details>
<summary><strong>CLAUDE.md</strong> (Claude Code)</summary>

```markdown
## MCP Tools

When Pare MCP tools are available (prefixed with mcp\_\_pare-\*), prefer them over
running raw CLI commands via Bash. Pare tools return structured JSON with ~85%
fewer tokens than CLI output.

- Git: mcp**pare-git**status, log, diff, branch, show, add, commit, push, pull, checkout
- Tests: mcp**pare-test**run, mcp**pare-test**coverage (pytest, jest, vitest, mocha)
- Builds: mcp**pare-build**tsc, build, esbuild, vite-build, webpack
- Linting: mcp**pare-lint**lint, format-check, prettier-format, biome-check, biome-format
- npm: mcp**pare-npm**install, audit, outdated, list, run, test, init
- Docker: mcp**pare-docker**ps, build, logs, images, run, exec, compose-up, compose-down, pull
- Python: mcp**pare-python**pip-install, mypy, ruff-check, pip-audit, pytest, uv-install, uv-run, black
- Cargo: mcp**pare-cargo**build, test, clippy, run, add, remove, fmt, doc, check
- Go: mcp**pare-go**build, test, vet, run, mod-tidy, fmt, generate
```

</details>

<details>
<summary><strong>AGENTS.md</strong> (OpenAI Codex, Gemini CLI, Claude Code)</summary>

```markdown
## MCP Servers

This project uses Pare MCP servers (62 tools) for structured, token-efficient dev tool output.
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
pare-docker, pare-python, pare-cargo, pare-go — 62 tools total) return
structured JSON with up to 95% fewer tokens than raw CLI output.
```

</details>

<details>
<summary><strong>.github/copilot-instructions.md</strong> (GitHub Copilot)</summary>

```markdown
## Tool Preferences

This project uses Pare MCP servers (@paretools/\*) for structured dev tool output.
When available, prefer Pare tools (pare-git, pare-test, pare-build, pare-lint, pare-npm, pare-docker, pare-python, pare-cargo, pare-go) over raw CLI commands.
```

</details>

<details>
<summary><strong>GEMINI.md / .windsurfrules / .clinerules / .amazonq/rules/</strong></summary>

```markdown
When Pare MCP tools are available, prefer them over raw CLI commands.
Pare tools return structured JSON with fewer tokens than CLI output.

- pare-git: status, log, diff, branch, show, add, commit, push, pull, checkout
- pare-test: run, coverage (pytest, jest, vitest, mocha)
- pare-build: tsc, build, esbuild, vite-build, webpack
- pare-lint: lint, format-check, prettier-format, biome-check, biome-format
- pare-npm: install, audit, outdated, list, run, test, init
- pare-docker: ps, build, logs, images, run, exec, compose-up, compose-down, pull
- pare-python: pip-install, mypy, ruff-check, pip-audit, pytest, uv-install, uv-run, black
- pare-cargo: build, test, clippy, run, add, remove, fmt, doc, check
- pare-go: build, test, vet, run, mod-tidy, fmt, generate
```

</details>

## Troubleshooting

| Issue                               | Solution                                                                                  |
| ----------------------------------- | ----------------------------------------------------------------------------------------- |
| `npx` not found / ENOENT on Windows | Use `cmd /c npx` wrapper (see Windows config above)                                       |
| Slow first start                    | Run `npx -y @paretools/git` once to cache, or install globally: `npm i -g @paretools/git` |
| Node.js version error               | Pare requires Node.js >= 20                                                               |
| NVM/fnm PATH issues                 | Use absolute path to `npx`: e.g., `~/.nvm/versions/node/v22/bin/npx`                      |
| MCP connection timeout              | Set `MCP_TIMEOUT=30000` for Claude Code, or increase `initTimeout` in client config       |
| Too many tools filling context      | Only install the Pare servers relevant to your project — you don't need all 9             |

## Contributing

Each server is a self-contained package. See [CONTRIBUTING.md](./CONTRIBUTING.md) for the full guide.

## License

[MIT](./LICENSE)
