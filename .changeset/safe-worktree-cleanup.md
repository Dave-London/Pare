---
"@paretools/git": minor
---

Add safe worktree-cleanup primitives (#921): `branch` gains an opt-in `mergedInto` ancestry check (per-branch `merged`/`unmerged`), `worktree list` gains opt-in `withStatus` (dirty/ahead/behind/unpushed) and `mergedInto` enrichment, and a new `worktree` action `prune-merged {base, requireClean}` batch-removes merged-clean worktrees while refusing dirty, unmerged, locked, bare, main, and current worktrees.
