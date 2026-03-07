# Setup Pare with Claude Code

## Quick Setup (Recommended)

```bash
# 1. Install Pare servers
npx @paretools/init --client claude-code --preset web

# 2. Add agent rules to your project
cat node_modules/@paretools/init/rules/CLAUDE.md >> CLAUDE.md

# 3. Restart Claude Code

# 4. Validate
npx @paretools/doctor
```

**Available presets:** `web`, `python`, `rust`, `go`, `jvm`, `dotnet`, `ruby`, `swift`, `mobile`, `devops`, `full` — see the [Quickstart Guide](../quickstart.md) for preset details.

## Manual Configuration

**Config file:** `{project}/.claude/settings.local.json`

### Option A: CLI

```bash
claude mcp add --transport stdio pare-git -- npx -y @paretools/git
claude mcp add --transport stdio pare-test -- npx -y @paretools/test
# Repeat for each server you need
```

### Option B: JSON

Add to `.claude/settings.local.json`:

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

Append to your project's `CLAUDE.md`:

```markdown
## MCP Tools

When Pare MCP tools are available (prefixed with mcp\_\_pare-\*), prefer them over
running raw CLI commands via Bash. Pare tools return structured JSON — reliable,
typed data with up to 95% fewer tokens than CLI output.
```

Or copy the full rule file:

```bash
cat node_modules/@paretools/init/rules/CLAUDE.md >> CLAUDE.md
```

## Optional: Enforcement Hook

Install the PreToolUse hook to automatically redirect raw CLI calls to Pare tools:

```bash
mkdir -p .claude/hooks
cp hooks/pare-prefer-mcp.sh .claude/hooks/
chmod +x .claude/hooks/pare-prefer-mcp.sh
```

Add to `.claude/settings.json`:

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Bash",
        "hooks": [
          {
            "type": "command",
            "command": "./.claude/hooks/pare-prefer-mcp.sh"
          }
        ]
      }
    ]
  }
}
```

See the [Agent Integration Guide](../agent-integration.md#claude-code-hooks-deep-dive) for details on how the hook works.

## Verify

```bash
npx @paretools/doctor
```

A successful run confirms all configured servers are reachable and tools are registered.
