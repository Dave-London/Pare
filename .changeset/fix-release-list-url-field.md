---
"@paretools/github": patch
---

Fix `release-list` always failing with `Unknown JSON field: "url"`. The `url` field is not a valid `--json` field for `gh release list` (only `gh release view` exposes it). Removed `url` from the requested gh fields, parser, and output schema. Use `release-view` if you need a release URL. Closes #868.
