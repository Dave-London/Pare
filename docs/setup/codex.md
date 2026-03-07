# Setup Pare with OpenAI Codex

## Manual Configuration

**Config file:** `{project}/.codex/config.toml`

```toml
[mcp_servers.pare-git]
command = "npx"
args = ["-y", "@paretools/git"]

[mcp_servers.pare-test]
command = "npx"
args = ["-y", "@paretools/test"]
```

Add more servers as needed — each follows the same pattern with `@paretools/<server-name>`.

## Verify

Restart Codex after editing the config. Use `npx @paretools/doctor` to confirm servers are reachable.
