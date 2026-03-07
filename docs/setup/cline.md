# Setup Pare with Cline / Roo Code

## Quick Setup (Recommended)

```bash
# 1. Install Pare servers
npx @paretools/init --client cline --preset web

# 2. Add agent rules
mkdir -p .clinerules
cp node_modules/@paretools/init/rules/.clinerules/pare.md .clinerules/pare.md

# 3. Restart your editor

# 4. Validate
npx @paretools/doctor
```

**Available presets:** `web`, `python`, `rust`, `go`, `jvm`, `dotnet`, `ruby`, `swift`, `mobile`, `devops`, `full` — see the [Quickstart Guide](../quickstart.md) for preset details.

## Manual Configuration

Cline and Roo Code use the standard `mcpServers` JSON format. Add to your MCP config:

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

Copy the Cline rules file:

```bash
mkdir -p .clinerules
cp node_modules/@paretools/init/rules/.clinerules/pare.md .clinerules/pare.md
```

## Verify

Restart your editor after editing the config. Use `npx @paretools/doctor` to confirm servers are reachable.
