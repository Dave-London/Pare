---
"@paretools/docker": minor
---

feat(docker): expand output schemas, improve parsers and error handling across tools (P1)

- #97: Improve build error parsing with structured errors (line numbers, Dockerfile context)
- #98: Support multiple tags — `tag` accepts `string | string[]` for multiple `-t` flags
- #99: Populate per-service `duration` in compose-build output
- #100: Enrich compose-down with per-container `{name, action}` details
- #101: Separate volume/network removal counts from container counts
- #102: Add `follow` param mapping to `-f` for bounded log streaming
- #103: Improve timestamp parsing for timezone offsets and nanoseconds
- #104: Add log level extraction from common patterns (bracket, level=, prefix)
- #105: Parse `Health` field and add `health` to compose-ps schema
- #106: Add `running`/`stopped` count fields to compose-ps
- #107: Enrich compose-up with per-service state details
- #108: Add output truncation with `limit` param and `isTruncated` to exec
- #109: Rename `filter` to `reference` in images tool to avoid confusion
- #110: Parse `CreatedAt` as ISO timestamp in images output
- #111: Add `networkSettings` (IP, ports) to inspect schema
- #112: Add `mounts` field to inspect schema
- #113: Separate stdout/stderr capture in logs output
- #114: Clarify tail vs limit dual-truncation in logs docs
- #115: Add `labels` field to network-ls schema
- #116: Add `ipv6`, `internal`, `attachable` booleans to network-ls
- #117: Capture `labels` as `Record<string, string>` in ps
- #118: Capture `networks` as `string[]` in ps
- #119: Fix digest-only pull parsing — set `tag` to digest ref
- #120: Add `size` output field from pull summary
- #121: Return structured error with `exitCode`, `stderr`, `errorCategory` in run
- #122: Capture stdout/stderr for non-detached runs
- #123: Add `memoryUsageBytes` and `memoryLimitBytes` numeric fields to stats
- #124: Add structured I/O fields: `netIn`, `netOut`, `blockRead`, `blockWrite` to stats
- #125: Add `labels` field to volume-ls schema
