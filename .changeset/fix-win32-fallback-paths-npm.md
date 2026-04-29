---
"@paretools/shared": patch
---

Add npm/npx/pnpm/yarn to `_WIN32_FALLBACK_PATHS` so `pare-npm` and other Node-package-manager calls succeed on Windows + Git Bash when the spawned MCP server doesn't inherit the user's PATH (the same root condition as #820). The cross-spawn cmd.exe wrapper in `_buildSpawnConfig` already handled `.cmd` correctly — only the fallback registry was missing entries. Fixes #839.
