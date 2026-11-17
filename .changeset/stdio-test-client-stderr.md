---
"@paretools/shared": patch
---

Add a shared stdio integration-test client helper that captures bounded child stderr and rethrows `connect()` failures with that stderr attached, making `MCP error -32000: Connection closed` failures diagnosable (#1085).
