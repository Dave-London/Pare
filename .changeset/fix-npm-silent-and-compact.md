---
"@paretools/npm": patch
---

Surface npm failures and restore the compact list payload.

- `outdated`: a non-zero exit with no output, or npm's `{"error": ...}` JSON payload, now returns an error instead of reading as "everything up to date" (#1024)
- `audit`: unparseable output or a failed run (e.g. ENOLOCK) now returns a structured Pare error via the shared `errorOutput`/`classifyError` helpers instead of a raw SyntaxError or a false "no vulnerabilities" (#1024)
- compact `list` output now includes `dependencyCount`, `problems`, `packageManager`, and the first 20 top-level dependencies with an omitted-count marker (#1022)
- compact `info` output now includes `dependencyCount` and `versionCount` (#1022)
