---
"@paretools/npm": minor
---

Add XS-complexity missing flags and security fixes across all npm tools:

- **init**: `force` (--force), `private` (yarn --private)
- **install**: `saveDev` (--save-dev), `frozenLockfile` (--frozen-lockfile / npm ci), `dryRun` (--dry-run), `production` (--omit=dev / --prod / --production), `legacyPeerDeps` (--legacy-peer-deps), `force` (--force), `noAudit` (--no-audit), `exact` (--save-exact)
- **list**: `production` (--omit=dev / --prod), `all` (--all), `long` (--long), `global` (--global), security fix for `filter` param
- **outdated**: `production` (--omit=dev / --prod), `all` (--all), `long` (--long), `compatible` (--compatible), `devOnly` (--dev), security fix for `filter` param
- **run**: `ifPresent` (--if-present), `recursive` (--recursive / --workspaces), `ignoreScripts` (--ignore-scripts), `silent` (--silent), `parallel` (--parallel), `stream` (--stream)
- **test**: `ifPresent` (--if-present), `recursive` (--recursive / --workspaces), `ignoreScripts` (--ignore-scripts), `silent` (--silent), `parallel` (--parallel), `stream` (--stream)
- **search**: `preferOnline` (--prefer-online)
- **audit**: `packageLockOnly` (--package-lock-only)
