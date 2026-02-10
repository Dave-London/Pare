# Pare

**Dev tools, optimized for agents. Up to 92% fewer tokens, 100% structured output.**

Pare is a collection of [MCP](https://modelcontextprotocol.io) servers that wrap popular developer tools with structured, token-efficient, schema-validated output optimized for AI coding agents.

## The Problem

AI coding agents spend most of their tokens reading tool output designed for humans — ANSI colors, progress bars, ASCII art, instructional hints. This is wasteful and expensive.

| Tool Command                             | Raw Tokens | Pare Tokens | Reduction |
| ---------------------------------------- | ---------: | ----------: | --------: |
| `git log --stat` (5 commits, verbose)    |      4,992 |         382 |   **92%** |
| `vitest run` (28 tests, all pass)        |        196 |          39 |   **80%** |
| `git status` (working tree)              |         62 |          51 |   **18%** |
| `git log --oneline` (5 commits, compact) |         59 |         382 |     -547% |

> Token counts measured with `~4 chars/token` approximation. Savings are highest on verbose, human-formatted output (test runners, build logs, detailed git history). Compact output like `--oneline` is already token-efficient — structured JSON adds overhead there.

## How It Works

Every Pare tool returns dual output:

- **`content`** — Human-readable text (for MCP clients that display it)
- **`structuredContent`** — Typed, schema-validated JSON (for agents)

Pare uses MCP's `structuredContent` + `outputSchema` spec features to deliver type-safe, validated structured output that agents can consume directly.

## Available Servers

| Package                                         | Tools                                    | Wraps                |
| ----------------------------------------------- | ---------------------------------------- | -------------------- |
| [`@paretools/git`](./packages/server-git)       | status, log, diff, branch, show          | git                  |
| [`@paretools/test`](./packages/server-test)     | run, coverage                            | pytest, jest, vitest |
| [`@paretools/npm`](./packages/server-npm)       | install, audit, outdated, list           | npm                  |
| [`@paretools/docker`](./packages/server-docker) | ps, build, logs, images                  | docker               |
| [`@paretools/build`](./packages/server-build)   | tsc, build                               | tsc, generic builds  |
| [`@paretools/lint`](./packages/server-lint)     | lint, format-check                       | eslint, prettier     |
| [`@paretools/python`](./packages/server-python) | pip-install, mypy, ruff-check, pip-audit | pip, mypy, ruff      |
| [`@paretools/cargo`](./packages/server-cargo)   | build, test, clippy                      | cargo                |
| [`@paretools/go`](./packages/server-go)         | build, test, vet                         | go                   |

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

- Git: mcp**pare-git**status, mcp**pare-git**log, mcp**pare-git**diff, etc.
- Tests: mcp**pare-test**run, mcp**pare-test**coverage
- Builds: mcp**pare-build**tsc, mcp**pare-build**build
- Linting: mcp**pare-lint**lint, mcp**pare-lint**format_check
```

</details>

<details>
<summary><strong>AGENTS.md</strong> (OpenAI Codex, Gemini CLI, Claude Code)</summary>

```markdown
## MCP Servers

This project uses Pare MCP servers for structured, token-efficient dev tool output.
Prefer Pare MCP tools over raw CLI commands for git, testing, building, and linting.
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
terminal. Pare tools (pare-git, pare-test, pare-build, pare-lint, etc.) return
structured JSON with ~85% fewer tokens than raw CLI output.
```

</details>

<details>
<summary><strong>.github/copilot-instructions.md</strong> (GitHub Copilot)</summary>

```markdown
## Tool Preferences

This project uses Pare MCP servers (@paretools/\*) for structured dev tool output.
When available, prefer pare-git, pare-test, pare-build, and pare-lint over raw CLI commands.
```

</details>

<details>
<summary><strong>GEMINI.md / .windsurfrules / .clinerules / .amazonq/rules/</strong></summary>

```markdown
When Pare MCP tools are available, prefer them over raw CLI commands.
Pare tools return structured JSON with fewer tokens than CLI output.

- pare-git: git status, log, diff, branch, show
- pare-test: pytest, jest, vitest (run, coverage)
- pare-build: tsc, generic builds
- pare-lint: ESLint, Prettier
```

</details>

## Troubleshooting

| Issue                               | Solution                                                                                  |
| ----------------------------------- | ----------------------------------------------------------------------------------------- |
| `npx` not found / ENOENT on Windows | Use `cmd /c npx` wrapper (see Windows config above)                                       |
| Slow first start                    | Run `npx -y @paretools/git` once to cache, or install globally: `npm i -g @paretools/git` |
| Node.js version error               | Pare requires Node.js >= 18                                                               |
| NVM/fnm PATH issues                 | Use absolute path to `npx`: e.g., `~/.nvm/versions/node/v22/bin/npx`                      |
| MCP connection timeout              | Set `MCP_TIMEOUT=30000` for Claude Code, or increase `initTimeout` in client config       |
| Too many tools filling context      | Only install the Pare servers relevant to your project, not all 9                         |

## Contributing

Each server is a self-contained package. See [CONTRIBUTING.md](./CONTRIBUTING.md) for the full guide.

## License

[MIT](./LICENSE)
