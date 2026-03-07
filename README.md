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

**Reliable, structured CLI output for AI agents — no more parsing fragile terminal text.**

Pare provides [MCP](https://modelcontextprotocol.io) servers that wrap common developer tools (git, npm, docker, test runners, etc.) and return clean, schema-validated JSON instead of raw terminal text. Agents get typed data they can act on directly, without brittle string parsing.

## The Problem

Parsing CLI output is fragile. Raw terminal text includes ANSI escape codes, decorative headers, progress bars, locale-specific formatting, and platform differences that break agent workflows in subtle ways. An agent that works fine with `git status` on macOS may fail on Windows because the output format changed. A test runner's summary line might shift between versions, silently breaking a regex.

Pare eliminates this entire class of errors by returning schema-validated JSON with consistent field names, regardless of platform, tool version, or locale. As a bonus, structured output is significantly smaller — agents use fewer tokens per tool call:

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

## Available Servers (28 packages, 240 tools)

Install only the servers relevant to your stack — most projects need just 2–4. The full catalog covers a wide range of ecosystems so Pare works wherever you do.

| Category             | Servers                                                                                                                                                                                                                                                                                                                                                        | Tools | Wraps                                                                      |
| -------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----: | -------------------------------------------------------------------------- |
| Version Control      | [git](./packages/server-git), [github](./packages/server-github)                                                                                                                                                                                                                                                                                               |    55 | git, gh                                                                    |
| Languages & Packages | [npm](./packages/server-npm), [python](./packages/server-python), [cargo](./packages/server-cargo), [go](./packages/server-go), [deno](./packages/server-deno), [bun](./packages/server-bun), [nix](./packages/server-nix), [dotnet](./packages/server-dotnet), [ruby](./packages/server-ruby), [swift](./packages/server-swift), [jvm](./packages/server-jvm) |   101 | npm, pip, cargo, go, deno, bun, nix, dotnet, gem, swift, gradle, maven     |
| Build, Lint & Test   | [build](./packages/server-build), [lint](./packages/server-lint), [test](./packages/server-test), [cmake](./packages/server-cmake), [bazel](./packages/server-bazel)                                                                                                                                                                                           |    23 | tsc, esbuild, vite, webpack, eslint, prettier, biome, vitest, pytest, jest |
| Infrastructure       | [docker](./packages/server-docker), [k8s](./packages/server-k8s), [infra](./packages/server-infra), [security](./packages/server-security), [remote](./packages/server-remote)                                                                                                                                                                                 |    40 | docker, kubectl, helm, terraform, ansible, trivy, ssh                      |
| Utilities            | [search](./packages/server-search), [http](./packages/server-http), [make](./packages/server-make), [process](./packages/server-process), [db](./packages/server-db)                                                                                                                                                                                           |    21 | ripgrep, fd, curl, make, just, psql, mysql, redis, mongosh                 |

> **[Tool Schemas](./docs/tool-schemas/)** — detailed response examples and field descriptions for every tool.
> See also **[Tool Response Examples](./docs/tool-response-examples.md)** for quick JSON samples.

## Quick Setup

```bash
# 1. Configure MCP servers (non-interactive)
npx @paretools/init --client claude-code --preset web

# 2. Add agent rules to your project
#    (append to existing CLAUDE.md, or copy if new)
cat node_modules/@paretools/init/rules/CLAUDE.md >> CLAUDE.md

# 3. Restart your client session

# 4. Validate
npx @paretools/doctor
```

**Available presets:** `web`, `python`, `rust`, `go`, `jvm`, `dotnet`, `ruby`, `swift`, `mobile`, `devops`, `full`

### Setup Guides by Client

|                                              |                                                  |                                           |
| -------------------------------------------- | ------------------------------------------------ | ----------------------------------------- |
| [Claude Code](./docs/setup/claude-code.md)   | [Claude Desktop](./docs/setup/claude-desktop.md) | [Cursor](./docs/setup/cursor.md)          |
| [VS Code / Copilot](./docs/setup/vscode.md)  | [Windsurf](./docs/setup/windsurf.md)             | [Cline / Roo Code](./docs/setup/cline.md) |
| [OpenAI Codex](./docs/setup/codex.md)        | [Gemini CLI](./docs/setup/gemini-cli.md)         | [Zed](./docs/setup/zed.md)                |
| [Continue.dev](./docs/setup/continue-dev.md) |                                                  |                                           |

> **[Full Quickstart Guide](./docs/quickstart.md)** — presets, ecosystem mapping, validation
>
> **[Manual Configuration](./docs/manual-configuration.md)** — config paths and formats for all clients
>
> **[Agent Integration Guide](./docs/agent-integration.md)** — rule files, hooks, CLI-to-MCP mapping

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
| `npx` not found / ENOENT on Windows | Use `cmd /c npx` wrapper (see your [client's setup guide](./docs/setup/))                           |
| Slow first start                    | Run `npx -y @paretools/git` once to cache, or install globally: `npm i -g @paretools/git`           |
| Node.js version error               | Pare requires Node.js >= 20                                                                         |
| NVM/fnm PATH issues                 | Use absolute path to `npx`: e.g., `~/.nvm/versions/node/v22/bin/npx`                                |
| MCP connection timeout              | Set `MCP_TIMEOUT=30000` for Claude Code, or increase `initTimeout` in client config                 |
| Too many tools filling context      | Use [tool selection](#tool-selection) env vars to limit tools, or only install the servers you need |

## Contributing

Each server is a self-contained package. See [CONTRIBUTING.md](./CONTRIBUTING.md) for the full guide.

## License

[MIT](./LICENSE)
