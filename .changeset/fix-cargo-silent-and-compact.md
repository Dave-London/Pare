---
"@paretools/cargo": patch
---

Surface silent toolchain failures and restore compact payloads (part of #1022 and #1024).

- `cargo build`/`check`/`clippy`/`test`: a non-zero exit with no parseable diagnostics/tests (missing Cargo.toml, toolchain error, clippy not installed) now attaches the raw stderr as `error` plus `exitCode` instead of returning a zeroed result that reads as clean. Failing tests and denied lints still parse normally with no `error`.
- `cargo audit`: unparseable output (cargo-audit missing, advisory DB fetch failure) now surfaces `error`/`exitCode` instead of a false-clean "0 vulnerabilities" result. Exit 1 with vulnerabilities found remains a successful scan.
- `cargo run` compact mode: keeps the executed binary's stdout/stderr, truncated to the shared compact budget with truncation metadata, instead of dropping them.
- `cargo audit` compact mode: keeps the first 10 advisory identities (id, package, version, severity, title, patched) plus an omitted count, instead of an empty vulnerabilities list.
- Compact mappers and text formatters pass through the new `error`/`exitCode` fields.
