---
"@paretools/git": patch
---

Fix stash-list reporting every entry as `stash@{0}`; resolve real incrementing indices from a date-free reflog selector so `--date` no longer corrupts them. Closes #908.
