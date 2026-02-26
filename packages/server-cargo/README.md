# @paretools/cargo

[![npm](https://img.shields.io/npm/v/@paretools/cargo.svg)](https://www.npmjs.com/package/@paretools/cargo)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](https://github.com/Dave-London/Pare/blob/main/LICENSE)

**Structured, token-efficient Rust/Cargo output for AI agents.** Up to 68% fewer tokens than raw `cargo` CLI output.

Part of the [Pare](https://github.com/Dave-London/Pare) suite of MCP servers.

## Tools (9)

| Tool     | Description                                                           |
| -------- | --------------------------------------------------------------------- |
| `build`  | Build diagnostics (file, line, code, severity, message)               |
| `test`   | Test results (name, status, pass/fail counts)                         |
| `clippy` | Lint diagnostics from clippy                                          |
| `run`    | Run a cargo binary with structured output (exit code, stdout, stderr) |
| `add`    | Add dependencies to a Rust project                                    |
| `remove` | Remove dependencies from a Rust project                               |
| `fmt`    | Check or fix Rust formatting                                          |
| `doc`    | Generate documentation with warning count                             |
| `check`  | Type check without full build (faster than build)                     |

## Quick Start

```bash
npx -y @paretools/cargo
```

Add to your MCP client config:

```json
{
  "mcpServers": {
    "pare-cargo": {
      "command": "npx",
      "args": ["-y", "@paretools/cargo"]
    }
  }
}
```

## Example

**`test` output:**

```json
{
  "passed": 24,
  "failed": 1,
  "ignored": 2,
  "total": 27,
  "tests": [
    { "name": "test_parse_input", "status": "ok" },
    { "name": "test_edge_case", "status": "FAILED" }
  ]
}
```

## All Pare Servers (240 tools)

| Package                                                              | Tools                                                                       | Wraps                              |
| -------------------------------------------------------------------- | --------------------------------------------------------------------------- | ---------------------------------- |
| [@paretools/git](https://www.npmjs.com/package/@paretools/git)       | status, log, diff, branch, show, add, commit, push, pull, checkout          | git                                |
| [@paretools/test](https://www.npmjs.com/package/@paretools/test)     | run, coverage                                                               | pytest, jest, vitest, mocha        |
| [@paretools/npm](https://www.npmjs.com/package/@paretools/npm)       | install, audit, outdated, list, run, test, init                             | npm                                |
| [@paretools/build](https://www.npmjs.com/package/@paretools/build)   | tsc, build, esbuild, vite-build, webpack                                    | tsc, esbuild, vite, webpack        |
| [@paretools/lint](https://www.npmjs.com/package/@paretools/lint)     | lint, format-check, prettier-format, biome-check, biome-format              | eslint, prettier, biome            |
| [@paretools/python](https://www.npmjs.com/package/@paretools/python) | pip-install, mypy, ruff-check, pip-audit, pytest, uv-install, uv-run, black | pip, mypy, ruff, pytest, uv, black |
| [@paretools/docker](https://www.npmjs.com/package/@paretools/docker) | ps, build, logs, images, run, exec, compose-up, compose-down, pull          | docker, docker compose             |
| **@paretools/cargo**                                                 | build, test, clippy, run, add, remove, fmt, doc, check                      | cargo                              |
| [@paretools/go](https://www.npmjs.com/package/@paretools/go)         | build, test, vet, run, mod-tidy, fmt, generate                              | go, gofmt                          |

## Compatible Clients

Works with any MCP-compatible client: [Claude Code](https://docs.anthropic.com/en/docs/claude-code), [Claude Desktop](https://claude.ai/download), [Cursor](https://cursor.com), [Windsurf](https://codeium.com/windsurf), [VS Code / GitHub Copilot](https://code.visualstudio.com), [Cline](https://github.com/cline/cline), [Roo Code](https://roocode.com), [Zed](https://zed.dev), [Continue.dev](https://continue.dev), [Gemini CLI](https://github.com/google-gemini/gemini-cli), [OpenAI Codex](https://openai.com/index/codex/)

## Links

- [Pare monorepo](https://github.com/Dave-London/Pare)
- [MCP protocol](https://modelcontextprotocol.io)

## License

[MIT](https://github.com/Dave-London/Pare/blob/main/LICENSE)
