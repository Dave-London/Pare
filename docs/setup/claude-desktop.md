# Setup Pare with Claude Desktop

## Quick Setup (Recommended)

```bash
# 1. Install Pare servers
npx @paretools/init --client claude-desktop --preset web

# 2. Restart Claude Desktop

# 3. Validate
npx @paretools/doctor
```

**Available presets:** `web`, `python`, `rust`, `go`, `jvm`, `dotnet`, `ruby`, `swift`, `mobile`, `devops`, `full` — see the [Quickstart Guide](../quickstart.md) for preset details.

## Manual Configuration

**Config file:**

- macOS/Linux: `~/.config/Claude/claude_desktop_config.json`
- Windows: `%APPDATA%/Claude/claude_desktop_config.json`

Add to your config:

```json
{
  "mcpServers": {
    "pare-git": {
      "command": "npx",
      "args": ["-y", "@paretools/git"]
    },
    "pare-test": {
      "command": "npx",
      "args": ["-y", "@paretools/test"]
    }
  }
}
```

<details>
<summary><strong>Windows</strong></summary>

On Windows, wrap `npx` with `cmd /c`:

```json
{
  "mcpServers": {
    "pare-git": {
      "command": "cmd",
      "args": ["/c", "npx", "-y", "@paretools/git"]
    }
  }
}
```

</details>

## Verify

Restart Claude Desktop after editing the config. Use `npx @paretools/doctor` to confirm servers are reachable.
