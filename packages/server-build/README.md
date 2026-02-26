# @paretools/build

[![npm](https://img.shields.io/npm/v/@paretools/build.svg)](https://www.npmjs.com/package/@paretools/build)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](https://github.com/Dave-London/Pare/blob/main/LICENSE)

**Structured, token-efficient build tool output for AI agents.** Up to 68% fewer tokens than raw build CLI output.

Part of the [Pare](https://github.com/Dave-London/Pare) suite of MCP servers.

## Tools (5)

| Tool         | Description                                                |
| ------------ | ---------------------------------------------------------- |
| `tsc`        | TypeScript compiler diagnostics (file, line, column, code) |
| `build`      | Generic build command with structured error/warning output |
| `esbuild`    | esbuild bundler with structured errors and output files    |
| `vite-build` | Vite production build with structured output file sizes    |
| `webpack`    | webpack build with structured assets, errors, and warnings |

## Quick Start

```bash
npx -y @paretools/build
```

Add to your MCP client config:

```json
{
  "mcpServers": {
    "pare-build": {
      "command": "npx",
      "args": ["-y", "@paretools/build"]
    }
  }
}
```

## Example

**`tsc` output:**

```json
{
  "success": false,
  "errors": [
    {
      "file": "src/index.ts",
      "line": 42,
      "column": 5,
      "code": 2322,
      "severity": "error",
      "message": "Type 'string' is not assignable to type 'number'."
    }
  ],
  "errorCount": 1,
  "warningCount": 0
}
```

## All Pare Servers (240 tools)

| Package                                                              | Tools                                                                       | Wraps                              |
| -------------------------------------------------------------------- | --------------------------------------------------------------------------- | ---------------------------------- |
| [@paretools/git](https://www.npmjs.com/package/@paretools/git)       | status, log, diff, branch, show, add, commit, push, pull, checkout          | git                                |
| [@paretools/test](https://www.npmjs.com/package/@paretools/test)     | run, coverage                                                               | pytest, jest, vitest, mocha        |
| [@paretools/npm](https://www.npmjs.com/package/@paretools/npm)       | install, audit, outdated, list, run, test, init                             | npm                                |
| **@paretools/build**                                                 | tsc, build, esbuild, vite-build, webpack                                    | tsc, esbuild, vite, webpack        |
| [@paretools/lint](https://www.npmjs.com/package/@paretools/lint)     | lint, format-check, prettier-format, biome-check, biome-format              | eslint, prettier, biome            |
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
