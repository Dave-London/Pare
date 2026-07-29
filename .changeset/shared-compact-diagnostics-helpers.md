---
"@paretools/shared": minor
---

Add shared compact-output and diagnostics helpers: `truncateStream`/`compactStreamFields` (head/tail + byte-cap stream truncation with `CompactStreamSchemaFields`, generalizing the server-process compact budget from #1020) and `surfaceEmptyFailure` (attaches `error`/`exitCode` when a CLI exits non-zero with nothing parseable, with `EmptyFailureSchemaFields`, generalizing server-test's `surfaceLoadFailure`). Foundation for epics #1022 and #1024.
