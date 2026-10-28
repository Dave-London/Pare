---
"@paretools/git": patch
---

`config` can now set `core.hooksPath` to a repo-tracked hooks directory such as `.githooks`: local or worktree scope only, a relative path that resolves (symlinks included) to a directory of tracked files inside the working tree. Global/system scope, absolute paths, paths outside the repo and untracked directories stay blocked.
