---
"@paretools/shared": minor
"@paretools/git": minor
"@paretools/test": minor
"@paretools/build": minor
"@paretools/cargo": minor
"@paretools/docker": minor
"@paretools/go": minor
"@paretools/lint": minor
"@paretools/npm": minor
"@paretools/python": minor
---

Security, discoverability, and test coverage improvements.

### Security

- Fix git argument injection: block ref/branch params starting with `-`
- Fix build command injection: allowlist of 24 known build tools
- New `assertNoFlagInjection` and `assertAllowedCommand` validation utilities

### Features

- Add MCP `instructions` field to all 9 servers for better client guidance
- Optimize tool descriptions with "Use instead of" phrasing for agent discoverability
- Increase default timeouts for build/install operations (5 min for docker, npm, cargo, go)

### Testing

- Expand test suite from 146 to 305 tests
- Add fidelity tests proving no information loss in git and vitest parsers
- Add formatter, integration, and validation tests across all packages

### Infrastructure

- Add `mcpName` field for Official MCP Registry compatibility
- Add Smithery registry configs for all 9 servers
- Add Dependabot, CODEOWNERS, FUNDING.yml, feature-request template
- Expand README with per-client configs, agent snippets, and troubleshooting
