# Setup Pare with Cursor

## Quick Setup (Recommended)

```bash
# 1. Install Pare servers
npx @paretools/init --client cursor --preset web

# 2. Add agent rules
mkdir -p .cursor/rules
cp node_modules/@paretools/init/rules/.cursor/rules/pare.mdc .cursor/rules/pare.mdc

# 3. Restart Cursor

# 4. Validate
npx @paretools/doctor
```

**Available presets:** `web`, `python`, `rust`, `go`, `jvm`, `dotnet`, `ruby`, `swift`, `mobile`, `devops`, `full` — see the [Quickstart Guide](../quickstart.md) for preset details.

## Manual Configuration

**Config file:** `~/.cursor/mcp.json`

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

Copy the Cursor rule file into your project:

```bash
mkdir -p .cursor/rules
cp node_modules/@paretools/init/rules/.cursor/rules/pare.mdc .cursor/rules/pare.mdc
```

The `alwaysApply: true` frontmatter ensures the rules are active for every conversation.

## Verify

Restart Cursor after editing the config. Use `npx @paretools/doctor` to confirm servers are reachable.
