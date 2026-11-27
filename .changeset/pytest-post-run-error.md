---
"@paretools/python": patch
---

fix(python): `pytest` explains a non-zero exit that happens after the tests ran ([#1215](https://github.com/Dave-London/Pare/issues/1215)). When a plugin or hook raised during reporting or teardown (for example a `rich` MarkupError), a run whose tests all passed came back as `success: false` with no reason, or as zero counts that read like "nothing ran". Now a run that printed its summary keeps pytest's counts and adds `postRunError: true`, `exitCode` and `errorOutput`; this also covers a failed `--cov-fail-under` check. A run that crashed before the summary line reports `countsUnavailable: true` with `exitCode` and keeps any failures pytest printed. `errorOutput` now prefers the traceback (INTERNALERROR lines, then stderr) over the stdout tail.
