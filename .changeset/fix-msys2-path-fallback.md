---
"@paretools/shared": patch
---

Add fallback PATH probing for Windows MSYS2/Git Bash environments where the MCP server process does not inherit the shell PATH, causing commands like git and gh to fail with "Command not found"
