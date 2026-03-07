# Setup Pare with Gemini CLI

## Quick Setup (Recommended)

```bash
# 1. Install Pare servers
npx @paretools/init --client gemini --preset web

# 2. Add agent rules
cp node_modules/@paretools/init/rules/GEMINI.md GEMINI.md

# 3. Restart Gemini CLI

# 4. Validate
npx @paretools/doctor
```

**Available presets:** `web`, `python`, `rust`, `go`, `jvm`, `dotnet`, `ruby`, `swift`, `mobile`, `devops`, `full` — see the [Quickstart Guide](../quickstart.md) for preset details.

## Manual Configuration

**Config file:** `~/.gemini/settings.json`

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

## Agent Rules

Copy the Gemini rules file to your project root:

```bash
cp node_modules/@paretools/init/rules/GEMINI.md GEMINI.md
```

## Verify

Restart Gemini CLI after editing the config. Use `npx @paretools/doctor` to confirm servers are reachable.
