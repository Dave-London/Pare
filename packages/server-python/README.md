# @paretools/python

[![npm](https://img.shields.io/npm/v/@paretools/python.svg)](https://www.npmjs.com/package/@paretools/python)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](https://github.com/Dave-London/Pare/blob/main/LICENSE)

**Structured, token-efficient Python tool output for AI agents.** Up to 65% fewer tokens than raw CLI output.

Part of the [Pare](https://github.com/Dave-London/Pare) suite of MCP servers.

## Tools (8)

| Tool          | Description                                             |
| ------------- | ------------------------------------------------------- |
| `pip-install` | Install packages, returns summary of installed items    |
| `mypy`        | Type-check diagnostics (file, line, severity, message)  |
| `ruff-check`  | Lint diagnostics (file, line, code, message)            |
| `pip-audit`   | Vulnerability report for installed packages             |
| `pytest`      | Run tests, returns structured pass/fail results         |
| `uv-install`  | Install packages via uv with structured summary         |
| `uv-run`      | Run a command in a uv-managed environment               |
| `black`       | Format code with Black, returns changed/unchanged files |

## Quick Start

```bash
npx -y @paretools/python
```

Add to your MCP client config:

```json
{
  "mcpServers": {
    "pare-python": {
      "command": "npx",
      "args": ["-y", "@paretools/python"]
    }
  }
}
```

## Example

**`mypy` output:**

```json
{
  "success": false,
  "errors": [
    {
      "file": "app/main.py",
      "line": 15,
      "severity": "error",
      "message": "Argument 1 to \"process\" has incompatible type \"str\"; expected \"int\"",
      "code": "arg-type"
    }
  ],
  "errorCount": 1,
  "warningCount": 0,
  "noteCount": 0
}
```

## All Pare Servers (149 tools)

| Package                                                              | Tools                                                                       | Wraps                              |
| -------------------------------------------------------------------- | --------------------------------------------------------------------------- | ---------------------------------- |
| [@paretools/git](https://www.npmjs.com/package/@paretools/git)       | status, log, diff, branch, show, add, commit, push, pull, checkout          | git                                |
| [@paretools/test](https://www.npmjs.com/package/@paretools/test)     | run, coverage                                                               | pytest, jest, vitest, mocha        |
| [@paretools/npm](https://www.npmjs.com/package/@paretools/npm)       | install, audit, outdated, list, run, test, init                             | npm                                |
| [@paretools/build](https://www.npmjs.com/package/@paretools/build)   | tsc, build, esbuild, vite-build, webpack                                    | tsc, esbuild, vite, webpack        |
| [@paretools/lint](https://www.npmjs.com/package/@paretools/lint)     | lint, format-check, prettier-format, biome-check, biome-format              | eslint, prettier, biome            |
| **@paretools/python**                                                | pip-install, mypy, ruff-check, pip-audit, pytest, uv-install, uv-run, black | pip, mypy, ruff, pytest, uv, black |
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
