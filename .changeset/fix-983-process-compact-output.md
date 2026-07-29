---
"@paretools/process": patch
---

Include stdout/stderr in compact `run` output instead of silently dropping them. Compact mode (the default) previously returned only `{exitCode, success, timedOut}`, making a successful command's output indistinguishable from a command that printed nothing. Each stream is now included, truncated to a small budget (first 40 lines + last 10 lines, with an 8KB per-stream byte cap). When truncation occurs, `stdoutTruncated`/`stderrTruncated` and `stdoutTotalLines`/`stderrTotalLines` are set so an agent knows to re-run with `compact:false` for the full output; when output fits the budget it is included whole with no truncation flags. The compact human-readable text now shows the (truncated) output as well.
