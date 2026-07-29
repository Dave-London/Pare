---
"@paretools/go": patch
---

Surface toolchain failures and restore compact payloads (#1022, #1024).

- `go test`: toolchain failures (e.g. "go: cannot find main module", bad -tags) that previously read as a zeroed clean result now surface the raw stderr tail via a new `error` field plus `exitCode`. Normal test failures are unaffected.
- `golangci-lint`: the parser now uses the exit code and stderr; linter crashes/config errors that previously read as a clean `{diagnostics: [], errors: 0}` result now surface `error` and `exitCode`. Exit code 1 with issues found remains a normal result.
- Compact `run`: stdout/stderr content is now kept (truncated to the shared compact budget with `stdoutTruncated`/`stderrTruncated` flags and total line counts) instead of being dropped entirely.
- Compact `get`: failing packages are kept with their `error`/`errorType` instead of being dropped.
- Compact `fmt`: parse errors are kept in full instead of being reduced to a count.
- Compact `golangci-lint`: the first 20 diagnostics are now included (fix data stripped, `diagnosticsOmitted` count when capped) instead of counts only; `error` is passed through.
