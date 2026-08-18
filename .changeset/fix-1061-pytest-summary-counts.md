---
"@paretools/python": patch
"@paretools/test": patch
---

fix(python,test): parse pytest counts only from the final summary line

The pytest summary parser scanned every output line for `N passed` / `N failed`
patterns, so free text that happened to contain a number next to a status word —
notably libpq's skip reason `port 5555 failed: Connection refused` — was scraped
as a count, producing self-contradictory results such as `failed: 5555` with
`success: true` and an empty `failures[]`. Counts now come only from pytest's own
final summary line (`===== N passed, M skipped in Xs =====`, also matched
undecorated under `-q`, last occurrence wins), a consistency guard zeroes
failure/error counts that have neither a summary line nor a parsed failure block
behind them, and a run with failures is never reported as a success.
