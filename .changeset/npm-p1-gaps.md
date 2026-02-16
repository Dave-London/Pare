---
"@paretools/npm": minor
---

feat(npm): improve install/list output, add nvm modes, add timeout detection (P1)

- Improve install output with specific package details (best-effort parsing)
- Fix pnpm workspace array handling in list tool (merges all workspace projects)
- Add dependency type field to list output (dependency/devDependency/optionalDependency)
- Add nvm ls-remote and exec actions
- Add LTS tagging to nvm version output
- Add timeout detection to run tool
- Add best-effort test result parsing to test tool (jest/vitest/mocha/tap)
