# @paretools/go

[![npm](https://img.shields.io/npm/v/@paretools/go.svg)](https://www.npmjs.com/package/@paretools/go)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](https://github.com/Dave-London/Pare/blob/main/LICENSE)

**Structured, token-efficient Go tool output for AI agents.** Typed diagnostics from go build, test, vet, and more.

Part of the [Pare](https://github.com/Dave-London/Pare) suite of MCP servers.

## Tools (7)

| Tool       | Description                                       |
| ---------- | ------------------------------------------------- |
| `build`    | Build errors (file, line, column, message)        |
| `test`     | Test results (name, status, package, elapsed)     |
| `vet`      | Static analysis diagnostics                       |
| `run`      | Run a Go program with structured output           |
| `mod-tidy` | Add missing and remove unused module dependencies |
| `fmt`      | Check or fix Go source formatting via gofmt       |
| `generate` | Run go generate directives in source files        |

## Quick Start

```bash
npx -y @paretools/go
```

Add to your MCP client config:

```json
{
  "mcpServers": {
    "pare-go": {
      "command": "npx",
      "args": ["-y", "@paretools/go"]
    }
  }
}
```

## Example

**`test` output:**

```json
{
  "passed": 15,
  "failed": 0,
  "skipped": 1,
  "total": 16,
  "tests": [
    {
      "name": "TestParseConfig",
      "package": "github.com/myapp/config",
      "status": "pass",
      "elapsed": 0.003
    }
  ]
}
```

## All Pare Servers (62 tools)

| Package                                                              | Tools                                                                       | Wraps                              |
| -------------------------------------------------------------------- | --------------------------------------------------------------------------- | ---------------------------------- |
| [@paretools/git](https://www.npmjs.com/package/@paretools/git)       | status, log, diff, branch, show, add, commit, push, pull, checkout          | git                                |
| [@paretools/test](https://www.npmjs.com/package/@paretools/test)     | run, coverage                                                               | pytest, jest, vitest, mocha        |
| [@paretools/npm](https://www.npmjs.com/package/@paretools/npm)       | install, audit, outdated, list, run, test, init                             | npm                                |
| [@paretools/build](https://www.npmjs.com/package/@paretools/build)   | tsc, build, esbuild, vite-build, webpack                                    | tsc, esbuild, vite, webpack        |
| [@paretools/lint](https://www.npmjs.com/package/@paretools/lint)     | lint, format-check, prettier-format, biome-check, biome-format              | eslint, prettier, biome            |
| [@paretools/python](https://www.npmjs.com/package/@paretools/python) | pip-install, mypy, ruff-check, pip-audit, pytest, uv-install, uv-run, black | pip, mypy, ruff, pytest, uv, black |
| [@paretools/docker](https://www.npmjs.com/package/@paretools/docker) | ps, build, logs, images, run, exec, compose-up, compose-down, pull          | docker, docker compose             |
| [@paretools/cargo](https://www.npmjs.com/package/@paretools/cargo)   | build, test, clippy, run, add, remove, fmt, doc, check                      | cargo                              |
| **@paretools/go**                                                    | build, test, vet, run, mod-tidy, fmt, generate                              | go, gofmt                          |

## Compatible Clients

Works with any MCP-compatible client: [Claude Code](https://docs.anthropic.com/en/docs/claude-code), [Claude Desktop](https://claude.ai/download), [Cursor](https://cursor.com), [Windsurf](https://codeium.com/windsurf), [VS Code / GitHub Copilot](https://code.visualstudio.com), [Cline](https://github.com/cline/cline), [Roo Code](https://roocode.com), [Zed](https://zed.dev), [Continue.dev](https://continue.dev), [Gemini CLI](https://github.com/google-gemini/gemini-cli), [OpenAI Codex](https://openai.com/index/codex/)

## Links

- [Pare monorepo](https://github.com/Dave-London/Pare)
- [MCP protocol](https://modelcontextprotocol.io)

## License

[MIT](https://github.com/Dave-London/Pare/blob/main/LICENSE)
