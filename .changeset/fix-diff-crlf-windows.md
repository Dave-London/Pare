---
"@paretools/git": patch
---

fix(git): strip CRLF from diff patch output on Windows and show chunks in text summary

On Windows, git emits `\r\n` line endings. The patch-splitting regex
captured a trailing `\r` in the filename, preventing a match against the
`parseDiffStat` result and leaving `chunks` empty when `full: true` was used.

This fix also updates `formatDiff` to include code chunks in the human-readable
text output, ensuring patch visibility in MCP clients that rely on the summary.
