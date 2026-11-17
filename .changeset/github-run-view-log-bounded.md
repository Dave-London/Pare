---
"@paretools/github": patch
---

`run-view` no longer returns an unbounded log that MCP clients cut without a marker (#1257). With `log` or `logFailed` and no `tailLines`, logs are cut to the last 300 lines and 30,000 characters, and the result always carries `logsTotalLines`, `logsReturnedLines` and `logsTruncated`. A new `grep` input keeps only lines matching a case-insensitive regular expression (with `logsMatchedLines`), so a failure in the middle of a long log can be found. An explicit `tailLines` still returns exactly that many lines. Jobs in the run summary now include their `id`, for the `job` filter.
