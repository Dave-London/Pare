---
"@paretools/init": minor
---

feat(init): add `@paretools/init` setup CLI and `pare-doctor` health check

- `npx @paretools/init` — interactive setup that auto-detects AI clients, offers presets, and writes config
- `npx @paretools/doctor` — health check that spawns configured servers and verifies MCP connectivity
- Supports 11 clients: Claude Code, Claude Desktop, Cursor, VS Code/Copilot, Windsurf, Zed, Cline, Roo Code, OpenAI Codex, Continue.dev, Gemini CLI
- 6 presets: web, python, rust, go, devops, full
- Platform-aware: auto-wraps npx with `cmd /c` on Windows
- Additive merge: never removes existing non-Pare config entries
