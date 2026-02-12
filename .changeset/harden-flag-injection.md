---
"@paretools/shared": patch
"@paretools/docker": patch
"@paretools/npm": patch
"@paretools/go": patch
"@paretools/cargo": patch
"@paretools/python": patch
"@paretools/git": patch
---

Fix assertNoFlagInjection whitespace bypass and add missing input validation across Docker, npm, Go, Cargo, and Python tools. Escape `%` in args on Windows to prevent env variable expansion.
