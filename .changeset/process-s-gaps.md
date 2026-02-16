---
"@paretools/process": minor
---

Add S-complexity gap implementations for the process run tool:

- Add `stdin` param for piping input data to commands (e.g., jq, grep)
- Add `maxBuffer` param to control maximum stdout+stderr buffer size
- Add `killSignal` param (enum) to control signal sent on timeout
- Add `maxOutputLines` param to truncate output by line count (agent-friendly)
- Add `encoding` param (enum) for non-UTF-8 output support
- Add `stdoutTruncatedLines` and `stderrTruncatedLines` output fields
