---
"@paretools/shared": patch
---

Improve "Command not found" error: now includes the platform, the first PATH entries the runner saw, and on Windows the well-known fallback paths probed plus whether each exists on disk. Makes #820-style failures (subagent PATH not inherited) self-debugging in the wild.
