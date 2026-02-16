---
"@paretools/github": minor
---

feat(github): improve api, gist, issue, pr, run tools output (P1)

- Preserve API error body in api tool
- Add GraphQL support to api tool
- Add content-based gist creation
- Detect already-closed issues in issue-close
- Parse review event from pr-review output
- Add error classification to pr-review
- Add reviews details to pr-view
- Expand run-list with headSha, event, startedAt, attempt
- Add rerun attempt tracking to run-rerun
