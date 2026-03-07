# Manual Configuration

If you prefer manual setup over `npx @paretools/init`, add the appropriate config entries to your client's config file.

> **Tip:** Use `npx @paretools/init` instead — it handles platform differences (e.g. Windows `cmd /c` wrapper) and merges safely with existing config.

## Config File Paths

| Client            | Config Path                                                                                                            |
| ----------------- | ---------------------------------------------------------------------------------------------------------------------- |
| Claude Code       | `{project}/.claude/settings.local.json`                                                                                |
| Claude Desktop    | `~/.config/Claude/claude_desktop_config.json` (macOS/Linux) or `%APPDATA%/Claude/claude_desktop_config.json` (Windows) |
| Cursor            | `~/.cursor/mcp.json`                                                                                                   |
| VS Code / Copilot | `{project}/.vscode/mcp.json`                                                                                           |
| Windsurf          | `~/.codeium/windsurf/mcp_config.json`                                                                                  |
| Zed               | `~/.config/zed/settings.json`                                                                                          |
| OpenAI Codex      | `{project}/.codex/config.toml`                                                                                         |
| Continue.dev      | `{project}/.continue/mcpServers/pare.yaml`                                                                             |
| Gemini CLI        | `~/.gemini/settings.json`                                                                                              |

## Standard Format (most clients)

Most MCP clients (Claude Code, Claude Desktop, Cursor, Windsurf, Cline, Roo Code, Gemini CLI) use the same JSON format:

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

## Windows

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

## Client-Specific Variations

See the per-client setup guides for exact formats:

- [Claude Code](./setup/claude-code.md)
- [Claude Desktop](./setup/claude-desktop.md)
- [Cursor](./setup/cursor.md)
- [VS Code / GitHub Copilot](./setup/vscode.md) — uses `"servers"` instead of `"mcpServers"`
- [Windsurf](./setup/windsurf.md)
- [Zed](./setup/zed.md) — uses `"context_servers"` format
- [OpenAI Codex](./setup/codex.md) — uses TOML format
- [Continue.dev](./setup/continue-dev.md) — uses YAML format
- [Cline / Roo Code](./setup/cline.md)
- [Gemini CLI](./setup/gemini-cli.md)
