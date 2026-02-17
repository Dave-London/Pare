# @paretools/lint

[![npm](https://img.shields.io/npm/v/@paretools/lint.svg)](https://www.npmjs.com/package/@paretools/lint)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](https://github.com/Dave-London/Pare/blob/main/LICENSE)

**Structured, token-efficient linter output for AI agents.** Typed diagnostics from ESLint, Prettier, and Biome.

Part of the [Pare](https://github.com/Dave-London/Pare) suite of MCP servers.

## Tools (5)

| Tool              | Description                                                 |
| ----------------- | ----------------------------------------------------------- |
| `lint`            | ESLint diagnostics (file, line, rule, severity, message)    |
| `format-check`    | Prettier check — list of files needing formatting           |
| `prettier-format` | Format files with Prettier (--write), returns changed files |
| `biome-check`     | Biome check (lint + format) with structured diagnostics     |
| `biome-format`    | Format files with Biome (--write), returns changed files    |

## Quick Start

```bash
npx -y @paretools/lint
```

Add to your MCP client config:

```json
{
  "mcpServers": {
    "pare-lint": {
      "command": "npx",
      "args": ["-y", "@paretools/lint"]
    }
  }
}
```

## Example

**`lint` output:**

```json
{
  "files": [
    {
      "file": "src/index.ts",
      "messages": [
        {
          "line": 10,
          "column": 3,
          "severity": "error",
          "rule": "no-unused-vars",
          "message": "'foo' is defined but never used."
        }
      ]
    }
  ],
  "errorCount": 1,
  "warningCount": 0
}
```

## All Pare Servers (149 tools)

| Package                                                              | Tools                                                                       | Wraps                              |
| -------------------------------------------------------------------- | --------------------------------------------------------------------------- | ---------------------------------- |
| [@paretools/git](https://www.npmjs.com/package/@paretools/git)       | status, log, diff, branch, show, add, commit, push, pull, checkout          | git                                |
| [@paretools/test](https://www.npmjs.com/package/@paretools/test)     | run, coverage                                                               | pytest, jest, vitest, mocha        |
| [@paretools/npm](https://www.npmjs.com/package/@paretools/npm)       | install, audit, outdated, list, run, test, init                             | npm                                |
| [@paretools/build](https://www.npmjs.com/package/@paretools/build)   | tsc, build, esbuild, vite-build, webpack                                    | tsc, esbuild, vite, webpack        |
| **@paretools/lint**                                                  | lint, format-check, prettier-format, biome-check, biome-format              | eslint, prettier, biome            |
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
