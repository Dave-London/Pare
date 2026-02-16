---
"@paretools/git": minor
---

Enrich output schemas for 10 git tools with structured fields:

- git/add: `files` now returns `Array<{file, status}>` instead of `string[]`
- git/branch: populate `upstream` field from `-vv` output
- git/cherry-pick: add `state` field ("completed", "conflict", "in-progress")
- git/diff: add `binary: boolean` field for binary file detection
- git/merge: add `state` field ("completed", "conflict", "already-up-to-date", "fast-forward")
- git/rebase: add `state` field ("completed", "conflict", "in-progress")
- git/reflog: add `totalAvailable` field for total entry count
- git/reset: add `previousRef`/`newRef` fields
- git/restore: add post-restore verification (`verified`, `verifiedFiles`)
- git/worktree: add `locked`/`prunable` fields
