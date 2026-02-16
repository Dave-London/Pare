---
"@paretools/search": minor
---

Implement S-complexity gaps for search tools:

**count**: Add `maxResults` param for per-file list truncation. Add `type` param (maps to `--type`) for file type filtering. Add `sort` param (`path` or `count`) for client-side result sorting.

**find**: Add `exclude` param (maps to `--exclude`) for pattern exclusion. Add `size` param (maps to `--size`) for file size filtering. Add `changedWithin` param (maps to `--changed-within`) for recent file discovery. Extend `type` enum with `executable` and `empty`. Normalize `ext` output to strip leading dot (matches input format).

**search**: Add `type` param (maps to `--type`) for file type filtering. Add `sort` param (maps to `--sort`) for rg-native result sorting.

**jq**: Add `arg` param (maps to `--arg`) for named string variables. Add `argjson` param (maps to `--argjson`) for named JSON variables.
