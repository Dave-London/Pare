# @paretools/build

Pare MCP server for **build tools**. Returns structured diagnostics from TypeScript and generic build commands.

## Tools

| Tool    | Description                                                |
| ------- | ---------------------------------------------------------- |
| `tsc`   | TypeScript compiler diagnostics (file, line, column, code) |
| `build` | Generic build command with structured error/warning output |

## Setup

```json
{
  "mcpServers": {
    "pare-build": {
      "command": "npx",
      "args": ["@paretools/build"]
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

## Links

- [Pare monorepo](https://github.com/Dave-London/pare)
- [MCP protocol](https://modelcontextprotocol.io)

## License

[MIT](https://github.com/Dave-London/pare/blob/main/LICENSE)
