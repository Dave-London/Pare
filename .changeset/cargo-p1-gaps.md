---
"@paretools/cargo": minor
---

feat(cargo): improve add/audit/build/clippy/fmt/remove/run/test/update output (P1)

- Add dependency type to add and remove output
- Add cargo audit fix support
- Include CVSS score/vector in audit vulnerabilities
- Use build-finished event for authoritative success
- Capture clippy suggestion text from JSON children
- Add lint level configuration to clippy
- Use --files-with-diff for more reliable fmt check
- Distinguish compilation vs runtime failure in run
- Add JSON message format for test compilation diagnostics
- Improve update compact mode with update count
