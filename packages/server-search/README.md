# @paretools/search

[![npm](https://img.shields.io/npm/v/@paretools/search.svg)](https://www.npmjs.com/package/@paretools/search)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](https://github.com/Dave-London/Pare/blob/main/LICENSE)

**Structured, token-efficient code search for AI agents.** Wraps [ripgrep](https://github.com/BurntSushi/ripgrep) and [fd](https://github.com/sharkdp/fd) with typed JSON output.

Part of the [Pare](https://github.com/Dave-London/Pare) suite of MCP servers.

## Tools (3)

| Tool     | Description                                                       |
| -------- | ----------------------------------------------------------------- |
| `search` | Search file contents with ripgrep, returns matches with locations |
| `find`   | Find files by name/pattern with fd, returns structured file list  |
| `count`  | Count pattern matches per file with ripgrep                       |

## Quick Start

```bash
npx -y @paretools/search
```

Add to your MCP client config:

```json
{
  "mcpServers": {
    "pare-search": {
      "command": "npx",
      "args": ["-y", "@paretools/search"]
    }
  }
}
```

## Example

**`search` output:**

```json
{
  "matches": [
    {
      "file": "src/index.ts",
      "line": 42,
      "column": 5,
      "matchText": "registerTool",
      "lineContent": "    registerTool(server);"
    }
  ],
  "totalMatches": 1,
  "filesSearched": 15
}
```

## Prerequisites

- [ripgrep](https://github.com/BurntSushi/ripgrep) (`rg`) for `search` and `count`
- [fd](https://github.com/sharkdp/fd) for `find`

## Compatible Clients

Works with any MCP-compatible client: [Claude Code](https://docs.anthropic.com/en/docs/claude-code), [Claude Desktop](https://claude.ai/download), [Cursor](https://cursor.com), [Windsurf](https://codeium.com/windsurf), [VS Code / GitHub Copilot](https://code.visualstudio.com), [Cline](https://github.com/cline/cline), [Roo Code](https://roocode.com), [Zed](https://zed.dev), [Continue.dev](https://continue.dev), [Gemini CLI](https://github.com/google-gemini/gemini-cli), [OpenAI Codex](https://openai.com/index/codex/)

## Links

- [Pare monorepo](https://github.com/Dave-London/Pare)
- [MCP protocol](https://modelcontextprotocol.io)

## License

[MIT](https://github.com/Dave-London/Pare/blob/main/LICENSE)
