# @paretools/go

Pare MCP server for **Go**. Returns structured output from go build, test, and vet.

## Tools

| Tool    | Description                                   |
| ------- | --------------------------------------------- |
| `build` | Build errors (file, line, column, message)    |
| `test`  | Test results (name, status, package, elapsed) |
| `vet`   | Static analysis diagnostics                   |

## Setup

```json
{
  "mcpServers": {
    "pare-go": {
      "command": "npx",
      "args": ["@paretools/go"]
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

## Links

- [Pare monorepo](https://github.com/Dave-London/pare)
- [MCP protocol](https://modelcontextprotocol.io)

## License

[MIT](https://github.com/Dave-London/pare/blob/main/LICENSE)
