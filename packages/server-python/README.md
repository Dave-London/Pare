# @paretools/python

Pare MCP server for **Python tools**. Returns structured output from pip, mypy, ruff, and pip-audit.

## Tools

| Tool          | Description                                            |
| ------------- | ------------------------------------------------------ |
| `pip-install` | Install packages, returns summary of installed items   |
| `mypy`        | Type-check diagnostics (file, line, severity, message) |
| `ruff-check`  | Lint diagnostics (file, line, code, message)           |
| `pip-audit`   | Vulnerability report for installed packages            |

## Setup

```json
{
  "mcpServers": {
    "pare-python": {
      "command": "npx",
      "args": ["@paretools/python"]
    }
  }
}
```

## Example

**`mypy` output:**

```json
{
  "success": false,
  "errors": [
    {
      "file": "app/main.py",
      "line": 15,
      "severity": "error",
      "message": "Argument 1 to \"process\" has incompatible type \"str\"; expected \"int\"",
      "code": "arg-type"
    }
  ],
  "errorCount": 1,
  "warningCount": 0,
  "noteCount": 0
}
```

## Links

- [Pare monorepo](https://github.com/Dave-London/pare)
- [MCP protocol](https://modelcontextprotocol.io)

## License

[MIT](https://github.com/Dave-London/pare/blob/main/LICENSE)
