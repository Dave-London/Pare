# @paretools/npm

[![npm](https://img.shields.io/npm/v/@paretools/npm.svg)](https://www.npmjs.com/package/@paretools/npm)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](https://github.com/Dave-London/pare/blob/main/LICENSE)

**Structured, token-efficient npm output for AI agents.** Up to 83% fewer tokens than raw `npm` CLI output.

Part of the [Pare](https://github.com/Dave-London/pare) suite of MCP servers.

## Tools (7)

| Tool       | Description                                        |
| ---------- | -------------------------------------------------- |
| `install`  | Install packages, returns added/removed summary    |
| `audit`    | Security audit, returns structured vulnerabilities |
| `outdated` | Check for outdated packages                        |
| `list`     | List installed packages as structured data         |
| `run`      | Run a package.json script with structured output   |
| `test`     | Run `npm test` with structured output              |
| `init`     | Initialize a new package.json                      |

## Quick Start

```bash
npx -y @paretools/npm
```

Add to your MCP client config:

```json
{
  "mcpServers": {
    "pare-npm": {
      "command": "npx",
      "args": ["-y", "@paretools/npm"]
    }
  }
}
```

## Example

**`audit` output:**

```json
{
  "vulnerabilities": [
    {
      "name": "lodash",
      "severity": "high",
      "title": "Prototype Pollution",
      "fixAvailable": true
    }
  ],
  "total": 1,
  "critical": 0,
  "high": 1,
  "moderate": 0,
  "low": 0
}
```

## All Pare Servers (62 tools)

| Package                                                              | Tools                                                                       | Wraps                              |
| -------------------------------------------------------------------- | --------------------------------------------------------------------------- | ---------------------------------- |
| [@paretools/git](https://www.npmjs.com/package/@paretools/git)       | status, log, diff, branch, show, add, commit, push, pull, checkout          | git                                |
| [@paretools/test](https://www.npmjs.com/package/@paretools/test)     | run, coverage                                                               | pytest, jest, vitest, mocha        |
| **@paretools/npm**                                                   | install, audit, outdated, list, run, test, init                             | npm                                |
| [@paretools/build](https://www.npmjs.com/package/@paretools/build)   | tsc, build, esbuild, vite-build, webpack                                    | tsc, esbuild, vite, webpack        |
| [@paretools/lint](https://www.npmjs.com/package/@paretools/lint)     | lint, format-check, prettier-format, biome-check, biome-format              | eslint, prettier, biome            |
| [@paretools/python](https://www.npmjs.com/package/@paretools/python) | pip-install, mypy, ruff-check, pip-audit, pytest, uv-install, uv-run, black | pip, mypy, ruff, pytest, uv, black |
| [@paretools/docker](https://www.npmjs.com/package/@paretools/docker) | ps, build, logs, images, run, exec, compose-up, compose-down, pull          | docker, docker compose             |
| [@paretools/cargo](https://www.npmjs.com/package/@paretools/cargo)   | build, test, clippy, run, add, remove, fmt, doc, check                      | cargo                              |
| [@paretools/go](https://www.npmjs.com/package/@paretools/go)         | build, test, vet, run, mod-tidy, fmt, generate                              | go, gofmt                          |

## Compatible Clients

Works with any MCP-compatible client: [Claude Code](https://docs.anthropic.com/en/docs/claude-code), [Claude Desktop](https://claude.ai/download), [Cursor](https://cursor.com), [Windsurf](https://codeium.com/windsurf), [VS Code / GitHub Copilot](https://code.visualstudio.com), [Cline](https://github.com/cline/cline), [Roo Code](https://roocode.com), [Zed](https://zed.dev), [Continue.dev](https://continue.dev), [Gemini CLI](https://github.com/google-gemini/gemini-cli), [OpenAI Codex](https://openai.com/index/codex/)

## Links

- [Pare monorepo](https://github.com/Dave-London/pare)
- [MCP protocol](https://modelcontextprotocol.io)

## License

[MIT](https://github.com/Dave-London/pare/blob/main/LICENSE)
