---
"@paretools/lint": minor
---

feat(lint): improve biome, prettier, and shellcheck parsers (P1)

- Improve biome-check line number extraction from JSON output (support both v2+ start/end format and legacy sourceCode format)
- Improve biome-format parser to use --reporter=json for accurate changed/unchanged file counts
- Use --list-different for more accurate prettier-format change counting
- Validate shellcheck file patterns and automatically expand directories to shell script files
