---
"@paretools/git": patch
---

Fix two git-server bugs around paths and worktree removal.

**`restore` verification lied about directory pathspecs (#1068).** The post-restore
check compared `git status --porcelain` lines against the requested paths by exact
string, so a directory pathspec (`src`, `src/`, `.`) never matched a status line and
`verified: true` came back regardless of what was left dirty. Verification now treats
a path as unrestored when any remaining status entry lies at or under it, and
translates pathspecs to repo-relative form first so it stays correct when the tool
runs from a subdirectory.

**`worktree` removal could report a failure it had already half-committed to
(#1073).** `git worktree remove` deletes the admin entry even when the recursive
delete of the working directory fails first — on Windows a large `node_modules` tree
trips that routinely with `Filename too long` — so `prune-merged` reported
`remove-failed` while the worktree was in fact unregistered, leaving an orphaned
directory that later `remove` calls rejected with "is not a working tree". Removal now
re-checks registration on failure: still registered means a genuine failure, reported
as `removed: false` with git's stderr in a new `error` field and nothing touched; no
longer registered means only the directory delete failed, so the tool finishes it with
a recursive delete and reports `removed: true` with `cleanedUp: true`. The same
handling applies to `action: "remove"`, whose thrown error now carries git's stderr.
