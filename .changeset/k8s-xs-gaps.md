---
"@paretools/k8s": minor
---

Add missing CLI flag parameters from XS-complexity audit gaps

- apply: serverSide, wait, recursive, kustomize, prune, force, forceConflicts
- describe: allNamespaces, showEvents
- get: ignoreNotFound, chunkSize
- helm: dryRun, wait, atomic, createNamespace, installOnUpgrade, reuseValues, allNamespaces, showResources, noHooks, skipCrds
- logs: timestamps, allContainers, limitBytes, prefix, ignoreErrors
