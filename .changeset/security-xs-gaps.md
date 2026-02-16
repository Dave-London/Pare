---
"@paretools/security": minor
---

Add missing CLI flag parameters from XS-complexity audit gaps

- trivy: assertNoFlagInjection on target, exitCode, skipDbUpdate
- semgrep: dataflowTraces, autofix, dryrun, maxTargetBytes, jobs
- gitleaks: followSymlinks, maxTargetMegabytes, logLevel, exitCode
