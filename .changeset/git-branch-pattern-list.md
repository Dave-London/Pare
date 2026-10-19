---
"@paretools/git": patch
---

fix(git): `branch` now filters the list with `--list <pattern>`. It used to pass the pattern as a bare name, which git reads as a branch to create, so filtering failed or created a branch (#1155)
