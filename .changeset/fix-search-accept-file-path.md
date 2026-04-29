---
"@paretools/search": patch
---

Fix `pare-search__search` and `pare-search__count` crashing with `spawn ENOTDIR` when `path` points to a file. The schema already promised file or directory; now both work. `pare-search__find` (fd) genuinely walks directories, so it now returns a typed `path must be a directory for find` error instead of leaking the raw Node `ENOTDIR`. Missing paths produce a clear `path does not exist: <path>` error. Closes #827.
