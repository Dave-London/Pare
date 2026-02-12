# @paretools/http

[![npm](https://img.shields.io/npm/v/@paretools/http.svg)](https://www.npmjs.com/package/@paretools/http)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](https://github.com/Dave-London/Pare/blob/main/LICENSE)

**Structured, token-efficient HTTP requests for AI agents.** Wraps [curl](https://curl.se/) with typed JSON output including status, headers, body, and timing.

Part of the [Pare](https://github.com/Dave-London/Pare) suite of MCP servers.

## Tools (4)

| Tool      | Description                                             |
| --------- | ------------------------------------------------------- |
| `request` | Make an HTTP request with any method, headers, and body |
| `get`     | Convenience GET request (no body)                       |
| `post`    | Convenience POST request (body required)                |
| `head`    | HEAD request returning headers only (no response body)  |

## Quick Start

```bash
npx -y @paretools/http
```

Add to your MCP client config:

```json
{
  "mcpServers": {
    "pare-http": {
      "command": "npx",
      "args": ["-y", "@paretools/http"]
    }
  }
}
```

## Example

**`get` output:**

```json
{
  "status": 200,
  "statusText": "OK",
  "headers": {
    "content-type": "application/json",
    "content-length": "1234"
  },
  "body": "{\"id\": 1, \"name\": \"example\"}",
  "timing": { "total": 0.125 },
  "size": 1234,
  "contentType": "application/json"
}
```

## Security

- Only `http://` and `https://` URL schemes are allowed (`file://`, `ftp://`, etc. are blocked)
- Header values are validated against CRLF injection
- Request body is passed via `--data-raw` to prevent curl `@file` expansion
- Redirect hops limited to 10

## Prerequisites

- [curl](https://curl.se/) (pre-installed on most systems)

## Compatible Clients

Works with any MCP-compatible client: [Claude Code](https://docs.anthropic.com/en/docs/claude-code), [Claude Desktop](https://claude.ai/download), [Cursor](https://cursor.com), [Windsurf](https://codeium.com/windsurf), [VS Code / GitHub Copilot](https://code.visualstudio.com), [Cline](https://github.com/cline/cline), [Roo Code](https://roocode.com), [Zed](https://zed.dev), [Continue.dev](https://continue.dev), [Gemini CLI](https://github.com/google-gemini/gemini-cli), [OpenAI Codex](https://openai.com/index/codex/)

## Links

- [Pare monorepo](https://github.com/Dave-London/Pare)
- [MCP protocol](https://modelcontextprotocol.io)

## License

[MIT](https://github.com/Dave-London/Pare/blob/main/LICENSE)
