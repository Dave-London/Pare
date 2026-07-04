---
"@paretools/git": patch
---

fix(git): return file content from `show` with `file` + `ref` in compact mode

`git show` with a `file` argument (blob extraction, e.g. `HEAD:src/index.ts`)
returned empty content in the default compact mode — the compact projection
used a commit-shaped map that emitted only an empty `hashShort` and a
`"blob ref:file"` message, dropping `fileContent` entirely. Because the raw
content and the structured payload are near-identical in size, the dual-output
helper always selected the compact branch, so the content was effectively never
returned unless `compact: false` was passed. `compactShowMap` now preserves
`fileContent` and object metadata for non-commit objects (blob/tag/tree). Also
raised the `file` input cap from 255 to 4096 chars to match `path`. Closes #926.
