---
"@paretools/shared": patch
---

fix: use synchronous `execFileSync` for Windows `taskkill` in `killProcessGroup()` to prevent orphan processes accumulating after timeouts
