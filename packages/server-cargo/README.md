# @paretools/cargo

Pare MCP server for **Rust/Cargo**. Returns structured output from cargo build, test, and clippy.

## Tools

| Tool     | Description                                             |
| -------- | ------------------------------------------------------- |
| `build`  | Build diagnostics (file, line, code, severity, message) |
| `test`   | Test results (name, status, pass/fail counts)           |
| `clippy` | Lint diagnostics from clippy                            |

## Setup

```json
{
  "mcpServers": {
    "pare-cargo": {
      "command": "npx",
      "args": ["@paretools/cargo"]
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

## Links

- [Pare monorepo](https://github.com/Dave-London/pare)
- [MCP protocol](https://modelcontextprotocol.io)

## License

[MIT](https://github.com/Dave-London/pare/blob/main/LICENSE)
