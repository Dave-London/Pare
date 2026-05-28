---
"@paretools/search": patch
---

Fix `pare-search__search` and `pare-search__count` crashing with `spawn ENOTDIR` when `path` points to a file. The runner previously used the supplied `path` as the child process `cwd` unconditionally, which fails when `path` is a file. The runner now resolves a file path into a parent-directory `cwd` plus a basename positional argument so ripgrep searches just that file (matching the schema's "Directory or file to search in" contract). Closes [#871](https://github.com/Dave-London/Pare/issues/871).
