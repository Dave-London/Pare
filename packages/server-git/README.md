# @paretools/git

Pare MCP server for **git**. Returns structured, token-efficient output from git commands.

## Tools

| Tool     | Description                                          |
| -------- | ---------------------------------------------------- |
| `status` | Working tree status (branch, staged, modified, etc.) |
| `log`    | Commit history                                       |
| `diff`   | File-level diff stats, optional full patch content   |
| `branch` | List, create, or delete branches                     |
| `show`   | Commit details and diff stats for a given ref        |

## Setup

Add to your MCP client config:

```json
{
  "mcpServers": {
    "pare-git": {
      "command": "npx",
      "args": ["@paretools/git"]
    }
  }
}
```

## Example

**`status` output:**

```json
{
  "branch": "main",
  "upstream": "origin/main",
  "ahead": 2,
  "staged": [{ "file": "src/index.ts", "status": "modified" }],
  "modified": ["README.md"],
  "untracked": ["temp.log"],
  "clean": false
}
```

## Links

- [Pare monorepo](https://github.com/Dave-London/pare)
- [MCP protocol](https://modelcontextprotocol.io)

## License

[MIT](https://github.com/Dave-London/pare/blob/main/LICENSE)
