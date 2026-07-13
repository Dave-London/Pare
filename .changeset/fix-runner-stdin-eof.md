---
"@paretools/shared": patch
---

Close child stdin when no input is provided so commands that wait for EOF, including Bun scripts, can exit normally.
