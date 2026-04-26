---
"@paretools/search": patch
---

Fix `search` and `count` crashing with `spawn ENOTDIR` when `path` points to a file. Both tools now resolve the supplied path: directories are used as the spawn `cwd` (existing behaviour), file paths are split into a parent-dir `cwd` plus a positional target argument so ripgrep searches just that file. The `find` tool now rejects file paths early with a typed `path must be a directory` error instead of leaking `ENOTDIR`. Missing paths now return a clear `path does not exist` error. Closes #827.
