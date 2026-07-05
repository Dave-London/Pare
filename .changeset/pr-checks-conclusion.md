---
"@paretools/github": minor
---

feat(github): add a top-level `conclusion` to `pr-checks` and make watch-mode timeouts non-throwing

`pr-checks` now returns `conclusion` (`"passed" | "failed" | "pending" | "timed_out"`) derived from the check buckets, so callers can branch on the aggregate outcome without re-deriving it from `summary`. In `watch` mode, hitting `watchTimeout` now returns the latest snapshot with `timedOut: true`, `conclusion: "timed_out"`, and `errorType: "watch-timeout"` instead of throwing — making "drive this PR to green" fully expressible as a single tool call whose result you branch on. Closes #932.
