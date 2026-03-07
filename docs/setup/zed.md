# Setup Pare with Zed

## Manual Configuration

**Config file:** `~/.config/zed/settings.json`

Add to your Zed settings:

```json
{
  "context_servers": {
    "pare-git": {
      "command": "npx",
      "args": ["-y", "@paretools/git"],
      "env": {}
    },
    "pare-test": {
      "command": "npx",
      "args": ["-y", "@paretools/test"],
      "env": {}
    }
  }
}
```

> Note: Zed uses `"context_servers"` (not `"mcpServers"`) and requires an `"env"` field.

## Verify

Restart Zed after editing the config. Use `npx @paretools/doctor` to confirm servers are reachable.
