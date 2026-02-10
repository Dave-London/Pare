# @paretools/lint

Pare MCP server for **linters**. Returns structured output from ESLint and Prettier.

## Tools

| Tool           | Description                                              |
| -------------- | -------------------------------------------------------- |
| `lint`         | ESLint diagnostics (file, line, rule, severity, message) |
| `format-check` | Prettier check — list of files needing formatting        |

## Setup

```json
{
  "mcpServers": {
    "pare-lint": {
      "command": "npx",
      "args": ["@paretools/lint"]
    }
  }
}
```

## Example

**`lint` output:**

```json
{
  "files": [
    {
      "file": "src/index.ts",
      "messages": [
        {
          "line": 10,
          "column": 3,
          "severity": "error",
          "rule": "no-unused-vars",
          "message": "'foo' is defined but never used."
        }
      ]
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
