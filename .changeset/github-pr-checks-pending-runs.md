---
"@paretools/github": patch
---

fix(github): `pr-checks` no longer concludes `passed` while a workflow run for the PR's head commit has not completed. A run queued behind a `concurrency` group has no check run yet, so a few fast checks that had finished used to read as green. Before concluding `passed`, the tool now checks the head commit's workflow runs; any that are unfinished make the result `pending` (and keep `watch` polling), listed in the new `pendingRuns` field (#1159)
