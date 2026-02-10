# @paretools/npm

Pare MCP server for **npm**. Returns structured output from npm commands.

## Tools

| Tool       | Description                                        |
| ---------- | -------------------------------------------------- |
| `install`  | Install packages, returns added/removed summary    |
| `audit`    | Security audit, returns structured vulnerabilities |
| `outdated` | Check for outdated packages                        |
| `list`     | List installed packages as structured data         |

## Setup

```json
{
  "mcpServers": {
    "pare-npm": {
      "command": "npx",
      "args": ["@paretools/npm"]
    }
  }
}
```

## Example

**`audit` output:**

```json
{
  "vulnerabilities": [
    {
      "name": "lodash",
      "severity": "high",
      "title": "Prototype Pollution",
      "fixAvailable": true
    }
  ],
  "total": 1,
  "critical": 0,
  "high": 1,
  "moderate": 0,
  "low": 0
}
```

## Links

- [Pare monorepo](https://github.com/Dave-London/pare)
- [MCP protocol](https://modelcontextprotocol.io)

## License

[MIT](https://github.com/Dave-London/pare/blob/main/LICENSE)
