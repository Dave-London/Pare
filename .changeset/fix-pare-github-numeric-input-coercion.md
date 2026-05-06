---
"@paretools/github": patch
---

Fix `pr-list`'s `limit` input rejecting JSON-number values (`"expected number, received string"`) and apply the same defensive `z.coerce.number()` pattern across other `pare-github` tools that take numeric inputs (`issue-list`, `run-list`, `label-list`, `release-list`, `discussion-list`, `repo-clone`).

Workaround was to omit the param. After this fix, callers can pass numbers as JSON numbers or numeric strings interchangeably, matching the existing `run-view`/`run-rerun` behavior.

Resolves #861.
