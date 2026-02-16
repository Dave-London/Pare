---
"@paretools/git": minor
---

feat(git): improve add, blame, commit, log, pull, remote, reset, show, stash output (P1)

- Add newlyStaged count to add output
- Use full 40-char hashes in blame
- Improve commit hash extraction for special branch names
- Add fullMessage field to log output
- Add parsed refs to log-graph entries
- Add conflict and changed file parsing to pull
- Add remote rename, set-url, prune, show subcommands
- Add files+mode validation to reset
- Guard against @@ delimiter corruption in show
- Add stash show action and stash-list content summary
