---
"@paretools/python": patch
---

fix(python): `pytest` only reads failure blocks from pytest's FAILURES and ERRORS sections, so pytest-cov's `____ coverage: platform ... ____` header (and `-rA`'s PASSES headers) no longer show up as a failed test on a passing run (#1181). The rule and header scans are linear now on long lines of `=` or `_` (#1182)
