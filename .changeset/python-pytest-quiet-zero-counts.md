---
"@paretools/python": patch
---

fix(python): stop `pytest` reporting `passed: 0` on a passing run when `-q` is also given in `extraArgs` or the project's `addopts`. The tool now pins an absolute `--verbosity` after all other options, and a passing run whose summary line cannot be found is returned with `countsUnavailable: true` instead of clean zero counts
