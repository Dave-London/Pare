# @paretools/docker

Pare MCP server for **Docker**. Returns structured output from Docker commands.

## Tools

| Tool     | Description                                         |
| -------- | --------------------------------------------------- |
| `ps`     | List containers with status, ports, and state       |
| `build`  | Build image, returns image ID, duration, and errors |
| `logs`   | Retrieve container logs as structured line arrays   |
| `images` | List images with repository, tag, and size info     |

## Setup

```json
{
  "mcpServers": {
    "pare-docker": {
      "command": "npx",
      "args": ["@paretools/docker"]
    }
  }
}
```

## Example

**`ps` output:**

```json
{
  "containers": [
    {
      "id": "abc123",
      "name": "my-app",
      "image": "node:22-alpine",
      "state": "running",
      "status": "Up 2 hours",
      "ports": ["0.0.0.0:3000->3000/tcp"]
    }
  ]
}
```

## Links

- [Pare monorepo](https://github.com/Dave-London/pare)
- [MCP protocol](https://modelcontextprotocol.io)

## License

[MIT](https://github.com/Dave-London/pare/blob/main/LICENSE)
