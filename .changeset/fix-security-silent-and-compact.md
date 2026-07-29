---
"@paretools/security": patch
---

Surface scanner failures and restore compact findings payload for trivy, semgrep, and gitleaks.

- A crashed scan (non-zero exit with no parseable report) no longer reads as a clean scan: the result now carries `error` (stderr/stdout tail) and `exitCode`, in both structured and text output.
- Exit-code semantics are respected per tool: gitleaks exit 1 with a findings report, trivy `--exit-code`, and semgrep findings exits are still treated as successful scans.
- Compact mode no longer drops the actionable payload: gitleaks compact (previously `{}`) now returns `totalFindings` plus the top findings (rule/file/line); trivy compact includes the top critical/high vulnerabilities (id, package, severity, fixed version); semgrep compact includes the top findings and always passes through `errors[]`. All compact projections carry `error`/`exitCode` and set a truncation flag when the list is cut.
