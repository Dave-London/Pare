---
"@paretools/github": minor
---

Add `pr-close`, `pr-reopen`, and `pr-ready` tools and fix `pr-checks` `watch: true`.

- New tools (#840): `pr-close { number, comment?, deleteBranch? }`, `pr-reopen { number, comment? }`, and `pr-ready { number, undo? }`. Each mirrors the `issue-close` shape and returns structured `{ number, state, url, ... }` data with typed error categories. They register alongside the other `pr-*` tools.
- `pr-checks` `watch: true` no longer crashes with `cannot use --watch with --json` (#844). The wrapper never passes gh's native `--watch` flag (which is incompatible with `--json`); instead it polls `gh pr checks --json ...` every `interval` seconds (default `10`, min `5`, max `300`) until no checks are in `pending`/`queued`, then returns the same structured payload as `watch: false` with extra `pollCount` and `waitedSeconds` fields. A new `watchTimeout` parameter (seconds, default `600`, max `3600`) bounds the wait; on timeout the tool throws `pr-checks watch timed out after <N>s — checks still pending: <list>` so callers can distinguish timeout from other failures.
