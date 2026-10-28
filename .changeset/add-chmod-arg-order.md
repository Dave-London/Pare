---
"@paretools/git": patch
---

`add`: place modifier flags (such as `--chmod=+x`, `--dry-run`, `--force`) before the `--` pathspec separator so git parses them as flags instead of treating them as missing files (#1216).
