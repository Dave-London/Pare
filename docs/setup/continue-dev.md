# Setup Pare with Continue.dev

## Manual Configuration

**Config file:** `{project}/.continue/mcpServers/pare.yaml`

```yaml
name: Pare Tools
version: 0.0.1
schema: v1
mcpServers:
  - name: pare-git
    type: stdio
    command: npx
    args: ["-y", "@paretools/git"]
  - name: pare-test
    type: stdio
    command: npx
    args: ["-y", "@paretools/test"]
```

Add more servers as needed — each follows the same pattern with `@paretools/<server-name>`.

## Verify

Restart your editor after saving the config. Use `npx @paretools/doctor` to confirm servers are reachable.
