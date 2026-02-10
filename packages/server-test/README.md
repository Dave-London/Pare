# @paretools/test

Pare MCP server for **test runners**. Auto-detects pytest, jest, or vitest and returns structured results.

## Tools

| Tool       | Description                                            |
| ---------- | ------------------------------------------------------ |
| `run`      | Run tests, returns pass/fail counts and failure details |
| `coverage` | Run tests with coverage, returns per-file summary       |

## Setup

```json
{
  "mcpServers": {
    "pare-test": {
      "command": "npx",
      "args": ["@paretools/test"]
    }
  }
}
```

## Example

**`run` output:**

```json
{
  "framework": "vitest",
  "passed": 46,
  "failed": 1,
  "skipped": 0,
  "total": 47,
  "failures": [
    {
      "name": "parseOutput > handles empty input",
      "file": "src/__tests__/parsers.test.ts",
      "message": "expected true to be false"
    }
  ]
}
```

## Links

- [Pare monorepo](https://github.com/Dave-London/pare)
- [MCP protocol](https://modelcontextprotocol.io)

## License

[MIT](https://github.com/Dave-London/pare/blob/main/LICENSE)
