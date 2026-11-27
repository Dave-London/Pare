---
"@paretools/github": patch
---

fix(github): `pr-diff` with `full: true` now returns hunk `chunks` for every file. The chunk step re-read each filename with a regex that matched the first `b/` on the `diff --git` line, so any path containing `b/` (`.github/`, `lib/`, `web/`) got no chunks and the call returned stats only. Chunks are now paired with files by position, the same way the stats are parsed.
