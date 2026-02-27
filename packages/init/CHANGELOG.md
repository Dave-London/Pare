# @paretools/init

## 0.13.1

## 0.13.0

### Patch Changes

- [#614](https://github.com/Dave-London/Pare/pull/614) [`7e2e014`](https://github.com/Dave-London/Pare/commit/7e2e014ec471b03855d186f1a9158e85afc8bc3c) Thanks [@Dave-London](https://github.com/Dave-London)! - Add package name allowlist for doctor health checks and backup creation for config file modifications

## 0.2.0

### Minor Changes

- [#599](https://github.com/Dave-London/Pare/pull/599) [`cbc81e0`](https://github.com/Dave-London/Pare/commit/cbc81e020d641156625a646bd565e79ab4b18530) Thanks [@Dave-London](https://github.com/Dave-London)! - feat(init): add `@paretools/init` setup CLI and `pare-doctor` health check
  - `npx @paretools/init` — interactive setup that auto-detects AI clients, offers presets, and writes config
  - `npx @paretools/doctor` — health check that spawns configured servers and verifies MCP connectivity
  - Supports 11 clients: Claude Code, Claude Desktop, Cursor, VS Code/Copilot, Windsurf, Zed, Cline, Roo Code, OpenAI Codex, Continue.dev, Gemini CLI
  - 6 presets: web, python, rust, go, devops, full
  - Platform-aware: auto-wraps npx with `cmd /c` on Windows
  - Additive merge: never removes existing non-Pare config entries
