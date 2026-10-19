---
"@paretools/git": patch
---

fix(git): `diff` and `show` take each file's status from git (`--summary`) instead of guessing it from the line counts, so a modification that only removes lines is no longer reported as `deleted`, and one that only adds lines is no longer `added` (#1099). Lines that are not numstat rows are skipped instead of becoming entries with an empty `file` (#1152). Renamed files now report the real new path in `file` (and the old one in `oldFile`) instead of the `{old => new}` notation, so `full: true` attaches their patch
