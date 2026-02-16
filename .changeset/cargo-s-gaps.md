---
"@paretools/cargo": minor
---

Add S-complexity gap implementations for Cargo tools:

- add: add package, rename, registry, locked/frozen/offline params; add error message to output schema
- audit: add success field, ignore, deny, targetArch/Os, file, db/url params; add advisory date; compact preserves informational/unknown counts
- build: add package, features, allFeatures, noDefaultFeatures, target, profile, locked/frozen/offline, manifestPath params
- check: add features, allFeatures, noDefaultFeatures, target, locked/frozen/offline params
- clippy: add success field, package, fix (with allow-dirty), features, locked/frozen/offline params
- doc: add package, features, target, locked/frozen/offline params; add outputDir to schema
- fmt: add package, edition, config, configPath, emit params
- remove: add dryRun, package, locked/frozen/offline, manifestPath params; add error message to output schema
- run: add bin, example, features, timeout, profile, target, locked/frozen/offline params
- test: add package, features, testArgs, locked/frozen/offline params
- tree: add success field (return error instead of throwing), invert, edges, features, format, target, locked/frozen/offline params
- update: add precise, locked/frozen/offline, manifestPath params
