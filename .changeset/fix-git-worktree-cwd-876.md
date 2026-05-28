---
"@paretools/git": patch
"@paretools/shared": patch
---

Clarify that the `path` parameter is authoritative: when omitted, repo-scoped tools operate on the server's own process working directory (its launch dir), not the caller's cwd. Callers in a git worktree or other directory must pass `path` explicitly to avoid operating on the wrong repository. Adds a regression test, documents the behavior in mutating git tool descriptions and the README, and updates the shared `repoPathInput` schema description. Closes #876.
