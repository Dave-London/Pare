# Pare Hooks

Pre-built hooks that enforce Pare MCP tool usage in coding agents.

## `pare-prefer-mcp.sh` — Claude Code PreToolUse Hook

This hook intercepts Bash tool calls that have Pare MCP equivalents and blocks them with a message pointing to the correct MCP tool. It covers all 16 Pare server packages.

### Quick Setup

1. Copy the hook into your project:

```bash
mkdir -p .claude/hooks
cp hooks/pare-prefer-mcp.sh .claude/hooks/pare-prefer-mcp.sh
chmod +x .claude/hooks/pare-prefer-mcp.sh
```

2. Add to `.claude/settings.json`:

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

3. Restart Claude Code. The hook is now active.

### Customization

The script has a config section at the top with toggle variables for each server:

```bash
PARE_GIT=1
PARE_GITHUB=1
PARE_NPM=1
PARE_SEARCH=1
# ...
```

To disable interception for a specific server, comment out its line:

```bash
# PARE_DOCKER=1    # Allow raw docker commands
# PARE_K8S=1       # Allow raw kubectl/helm commands
```

### How It Works

When Claude Code is about to execute a Bash command, the hook:

1. Reads the tool input from stdin (JSON with `.tool_input.command`)
2. Extracts the first binary in the command
3. Checks if that binary maps to a Pare MCP server
4. If matched, returns a JSON deny response with the correct MCP tool name
5. If not matched, exits silently to allow the command

The hook only checks the first command in pipes/chains to avoid false positives (e.g., `echo foo | grep bar` is allowed because `echo` is not intercepted).

### `settings.json`

An example Claude Code settings file is included at `hooks/settings.json` for reference. Copy the `hooks` section into your own `.claude/settings.json`.
