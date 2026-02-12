---
"@paretools/shared": minor
"@paretools/git": minor
"@paretools/npm": minor
"@paretools/docker": minor
"@paretools/test": minor
"@paretools/build": minor
"@paretools/lint": minor
"@paretools/python": minor
"@paretools/cargo": minor
"@paretools/go": minor
---

### Automatic compact mode

All 9 servers now support automatic compact mode. When structured JSON output would exceed the raw CLI token count, Pare automatically applies a compact projection — keeping essential fields and dropping verbose details like stack traces, individual diagnostics, and file-level stats. This ensures Pare always uses fewer tokens than raw CLI output. Each tool accepts a `compact` parameter (default: `true`) to opt out if needed.

### Security hardening

- Block dangerous Docker volume mounts (`/`, `/etc`, `/var/run/docker.sock`)
- Default `ignoreScripts: true` for npm install
- Validate all `args[]` arrays against flag injection
- Windows `cmd.exe` delayed expansion escaping
- Zod input size limits on all string/array parameters
- Error message sanitization to prevent path leakage

### Reliability

- Increased default `run()` timeout from 30s to 60s
- Fixed flaky Windows test timeouts
