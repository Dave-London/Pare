# Setup Pare with VS Code / GitHub Copilot

## Quick Setup (Recommended)

```bash
# 1. Install Pare servers
npx @paretools/init --client vscode --preset web

# 2. Add agent rules
mkdir -p .github
cp node_modules/@paretools/init/rules/.github/copilot-instructions.md .github/copilot-instructions.md

# 3. Restart VS Code

# 4. Validate
npx @paretools/doctor
```

**Available presets:** `web`, `python`, `rust`, `go`, `jvm`, `dotnet`, `ruby`, `swift`, `mobile`, `devops`, `full` — see the [Quickstart Guide](../quickstart.md) for preset details.

## Manual Configuration

**Config file:** `{project}/.vscode/mcp.json`

```json
{
  "servers": {
    "pare-git": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "@paretools/git"]
    },
    "pare-test": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "@paretools/test"]
    }
  }
}
```

> Note: VS Code uses `"servers"` (not `"mcpServers"`) and requires a `"type": "stdio"` field.

<details>
<summary><strong>Windows</strong></summary>

On Windows, wrap `npx` with `cmd /c`:

```json
{
  "servers": {
    "pare-git": {
      "type": "stdio",
      "command": "cmd",
      "args": ["/c", "npx", "-y", "@paretools/git"]
    }
  }
}
```

</details>

## Agent Rules

Copy the Copilot instructions file:

```bash
mkdir -p .github
cp node_modules/@paretools/init/rules/.github/copilot-instructions.md .github/copilot-instructions.md
```

## Verify

Restart VS Code after editing the config. Use `npx @paretools/doctor` to confirm servers are reachable.
