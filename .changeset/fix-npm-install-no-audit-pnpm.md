---
"@paretools/npm": patch
---

`pare-npm install` no longer emits `--no-audit` for pnpm or yarn. The flag is npm-specific — pnpm install rejects it with `ERROR Unknown option: 'audit'`, and yarn install does not run an audit step either. With this change, `noAudit: true` is honoured on npm (still maps to `--no-audit`) and is a silent no-op on pnpm/yarn, where install never audits anyway. The tool description has been updated to reflect this.

Resolves #872.
