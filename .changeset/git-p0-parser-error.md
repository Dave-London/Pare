---
"@paretools/git": minor
---

feat(git): add P0 parser bug fixes and error handling improvements

- Normalize reflog action field values across git versions
- Add structured error output for checkout conflicts/failures
- Add structured error output for push failures (rejected, non-fast-forward)
- Handle nothing-to-stash gracefully with clear reason field
- Handle stash pop/apply conflicts with structured conflict info
