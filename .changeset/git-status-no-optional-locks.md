---
"@paretools/git": patch
---

fix(git): `status` with `noLockIndex: true` now runs `git --no-optional-locks status`. It used to pass `--no-lock-index`, which `git status` rejects, so the option always failed (#1167)
