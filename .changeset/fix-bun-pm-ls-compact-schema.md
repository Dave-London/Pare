---
"@paretools/bun": patch
---

fix(bun): include `packages` in the compact `pm ls` output so it satisfies the pm-ls output schema

The compact projection for `bun pm ls` omitted the `packages` field, so the compacted `structuredContent` no longer matched `BunPmLsResult`. Declare `packages: []` on the compact shape so the compact output stays schema-valid.
