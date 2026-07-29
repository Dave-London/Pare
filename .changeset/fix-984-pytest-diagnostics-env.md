---
"@paretools/python": minor
---

pytest: surface collection/startup error diagnostics and add `env`/`extraArgs` inputs (#984)

- When a pytest run fails with no test results (e.g. `ModuleNotFoundError` from a src-layout project missing `PYTHONPATH`, or a broken plugin crashing at startup), the tool now includes `exitCode` and an `errorOutput` diagnostic (capped tail of the most informative output stream) instead of a silent all-zero result.
- New `env` input: extra environment variables merged over the parent environment (e.g. `{"PYTHONPATH": "src"}`).
- New `extraArgs` input: additional pytest CLI arguments passed through verbatim (e.g. `["-p", "no:logfire"]`).
