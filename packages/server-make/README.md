# @paretools/make

[![npm](https://img.shields.io/npm/v/@paretools/make.svg)](https://www.npmjs.com/package/@paretools/make)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](https://github.com/Dave-London/Pare/blob/main/LICENSE)

**Structured, token-efficient task runner output for AI agents.** Wraps [Make](https://www.gnu.org/software/make/) and [Just](https://github.com/casey/just) with typed JSON output.

Part of the [Pare](https://github.com/Dave-London/Pare) suite of MCP servers.

## Tools (2)

| Tool   | Description                                                         |
| ------ | ------------------------------------------------------------------- |
| `run`  | Run a make/just target, returns exit code, stdout, stderr, duration |
| `list` | List available targets with descriptions                            |

Auto-detects whether to use `just` (if Justfile present) or `make` (if Makefile present). Can be overridden per-call.

## Quick Start

```bash
npx -y @paretools/make
```

Add to your MCP client config:

```json
{
  "mcpServers": {
    "pare-make": {
      "command": "npx",
      "args": ["-y", "@paretools/make"]
    }
  }
}
```

## Example

**`list` output:**

```json
{
  "targets": [
    { "name": "build", "description": "Build the project" },
    { "name": "test", "description": "Run all tests" },
    { "name": "clean" }
  ],
  "total": 3,
  "tool": "just"
}
```

## Prerequisites

- [GNU Make](https://www.gnu.org/software/make/) and/or [Just](https://github.com/casey/just)

## Compatible Clients

Works with any MCP-compatible client: [Claude Code](https://docs.anthropic.com/en/docs/claude-code), [Claude Desktop](https://claude.ai/download), [Cursor](https://cursor.com), [Windsurf](https://codeium.com/windsurf), [VS Code / GitHub Copilot](https://code.visualstudio.com), [Cline](https://github.com/cline/cline), [Roo Code](https://roocode.com), [Zed](https://zed.dev), [Continue.dev](https://continue.dev), [Gemini CLI](https://github.com/google-gemini/gemini-cli), [OpenAI Codex](https://openai.com/index/codex/)

## Links

- [Pare monorepo](https://github.com/Dave-London/Pare)
- [MCP protocol](https://modelcontextprotocol.io)

## License

[MIT](https://github.com/Dave-London/Pare/blob/main/LICENSE)
