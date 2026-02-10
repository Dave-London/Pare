# pare

**Dev tools, optimized for agents. ~85% fewer tokens, 100% structured output.**

pare is a collection of [MCP](https://modelcontextprotocol.io) servers that wrap popular developer tools with structured, token-efficient, schema-validated output optimized for AI coding agents.

## The Problem

AI coding agents spend **76.1% of their tokens reading tool output** designed for humans — ANSI colors, progress bars, ASCII art, instructional hints. This is wasteful and expensive.

| Tool Command | Raw Tokens | pare Tokens | Reduction |
|---|---:|---:|---:|
| `pytest` (47 tests, all pass) | 186 | 8 | **96%** |
| `pytest` (47 tests, 1 fail) | 1,008 | 46 | **95%** |
| `npm install` (large project) | 526 | 55 | **90%** |
| `git log` (3 commits) | 501 | 71 | **86%** |
| `git status` (dirty) | 118 | 28 | **76%** |
| **Weighted average** | — | — | **~85%** |

## How It Works

Every pare tool returns dual output:
- **`content`** — Human-readable text (for MCP clients that display it)
- **`structuredContent`** — Typed, schema-validated JSON (for agents)

pare is the first MCP server suite to use `structuredContent` + `outputSchema` — new spec features that enable type-safe, validated structured output.

## Quick Start

```bash
# Install the git server
npx @paretools/git
```

Add to your MCP client config (e.g., Claude Code `~/.claude.json`):

```json
{
  "mcpServers": {
    "pare-git": {
      "command": "npx",
      "args": ["@paretools/git"]
    }
  }
}
```

## Available Servers

| Package | Tools | Status |
|---|---|---|
| [`@paretools/git`](./packages/server-git) | status, log, diff, branch, show | Available |
| `@paretools/test` | run, coverage (pytest/jest/vitest) | Coming soon |
| `@paretools/npm` | install, audit, outdated, list | Planned |
| `@paretools/docker` | ps, build, logs, compose | Planned |
| `@paretools/build` | tsc, esbuild, vite | Planned |

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

We'd love your help! The contribution model is simple: **each server is a self-contained package**. See [CONTRIBUTING.md](./CONTRIBUTING.md) for the full guide.

The easiest way to contribute is to add a new server for your favorite dev tool. Check the [open issues](https://github.com/Dave-London/pare/issues) for "new-server" requests.

## License

[MIT](./LICENSE)
