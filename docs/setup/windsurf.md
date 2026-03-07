# Setup Pare with Windsurf

## Quick Setup (Recommended)

```bash
# 1. Install Pare servers
npx @paretools/init --client windsurf --preset web

# 2. Add agent rules
cp node_modules/@paretools/init/rules/.windsurfrules .windsurfrules

# 3. Restart Windsurf

# 4. Validate
npx @paretools/doctor
```

**Available presets:** `web`, `python`, `rust`, `go`, `jvm`, `dotnet`, `ruby`, `swift`, `mobile`, `devops`, `full` — see the [Quickstart Guide](../quickstart.md) for preset details.

## Manual Configuration

**Config file:** `~/.codeium/windsurf/mcp_config.json`

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

## Agent Rules

Copy the Windsurf rules file to your project root:

```bash
cp node_modules/@paretools/init/rules/.windsurfrules .windsurfrules
```

The file must stay under 6,000 characters (it currently uses ~1,800).

## Verify

Restart Windsurf after editing the config. Use `npx @paretools/doctor` to confirm servers are reachable.
