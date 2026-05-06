---
"@paretools/git": patch
---

`pare-git status` now returns `ahead` and `behind` integer fields whenever an upstream is configured — including in the synced case (`0`/`0`), where they were previously omitted. When there is no upstream, both fields are explicitly `null` to distinguish "no tracking branch" from "synced".

This eliminates the need for follow-up `pare-git log` / GitHub-compare round-trips just to answer "is this branch fully pushed?" during worktree audits and similar housekeeping.

The `GitStatusSchema` now allows `ahead`/`behind` to be `number | null | undefined` (previously `number | undefined`).

Resolves #834 (sub-bug 3).
