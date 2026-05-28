---
"@paretools/git": patch
---

Fix `worktree` list with `listVerbose=true` crashing on git's `--verbose`/`--porcelain` conflict; locked/prunable detail (including prunable reason) is now surfaced via the porcelain parser. Closes #906.
