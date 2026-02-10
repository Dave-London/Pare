# pare

**Dev tools, optimized for agents. ~85% fewer tokens, 100% structured output.**

pare is a collection of [MCP](https://modelcontextprotocol.io) servers that wrap popular developer tools with structured, token-efficient, schema-validated output optimized for AI coding agents.

## The Problem

AI coding agents spend most of their tokens reading tool output designed for humans — ANSI colors, progress bars, ASCII art, instructional hints. This is wasteful and expensive.

| Tool Command                  | Raw Tokens | pare Tokens | Reduction |
| ----------------------------- | ---------: | ----------: | --------: |
| `pytest` (47 tests, all pass) |        186 |           8 |   **96%** |
| `pytest` (47 tests, 1 fail)   |      1,008 |          46 |   **95%** |
| `npm install` (large project) |        526 |          55 |   **90%** |
| `git log` (3 commits)         |        501 |          71 |   **86%** |
| `git status` (dirty)          |        118 |          28 |   **76%** |
| **Weighted average**          |          — |           — |  **~85%** |

## How It Works

Every pare tool returns dual output:

- **`content`** — Human-readable text (for MCP clients that display it)
- **`structuredContent`** — Typed, schema-validated JSON (for agents)

pare uses MCP's `structuredContent` + `outputSchema` spec features to deliver type-safe, validated structured output that agents can consume directly.

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

Add to your MCP client config (e.g., Claude Code `~/.claude.json`):

```json
{
  "mcpServers": {
    "pare-git": {
      "command": "npx",
      "args": ["@paretools/git"]
    },
    "pare-test": {
      "command": "npx",
      "args": ["@paretools/test"]
    }
  }
}
```

## Example: `git status`

**Raw git output (118 tokens):**

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

**pare structured output (28 tokens):**

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

76% fewer tokens. Zero information lost. Fully typed.

## Contributing

Each server is a self-contained package. See [CONTRIBUTING.md](./CONTRIBUTING.md) for the full guide.

## License

[MIT](./LICENSE)
