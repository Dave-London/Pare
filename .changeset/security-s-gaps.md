---
"@paretools/security": minor
---

Implement S-complexity gaps for security tools

- gitleaks: Add redact (default: true), config, baselinePath, logOpts, enableRule params
- semgrep: Change config to accept string | string[] for repeatable --config; add exclude, include, excludeRule, baselineCommit params
- trivy: Change severity to accept single value or array/CSV; add scanners, vulnType, skipDirs, skipFiles, platform, ignorefile params
