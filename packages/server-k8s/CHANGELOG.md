# @paretools/k8s

## 0.10.2

### Patch Changes

- [#570](https://github.com/Dave-London/Pare/pull/570) [`0c50be7`](https://github.com/Dave-London/Pare/commit/0c50be7760bc21ef20e735cef3da065ba93bb36d) Thanks [@Dave-London](https://github.com/Dave-London)! - Add `bugs` URL to package.json for all packages, linking to the GitHub issues page.

- Updated dependencies [[`0c50be7`](https://github.com/Dave-London/Pare/commit/0c50be7760bc21ef20e735cef3da065ba93bb36d)]:
  - @paretools/shared@0.10.2

## 0.10.1

### Patch Changes

- Updated dependencies [[`da71ee5`](https://github.com/Dave-London/Pare/commit/da71ee56c5626d929a28ce1838019a12d496187b)]:
  - @paretools/shared@0.10.1

## 0.10.0

### Patch Changes

- Updated dependencies [[`3a6f31c`](https://github.com/Dave-London/Pare/commit/3a6f31c92a3507388dacbf1fd69afa3f76e032e2)]:
  - @paretools/shared@0.10.0

## 0.9.0

### Minor Changes

- [#487](https://github.com/Dave-London/Pare/pull/487) [`48cd9c5`](https://github.com/Dave-London/Pare/commit/48cd9c51b89be6f001979cb0de16b43c91229347) Thanks [@Dave-London](https://github.com/Dave-London)! - feat(cargo,k8s,python,npm): add output truncation, helm uninstall/rollback, pip-list outdated, pyenv installList, uv-run flag isolation, npm audit fix, nvm .nvmrc

- [#481](https://github.com/Dave-London/Pare/pull/481) [`9251407`](https://github.com/Dave-London/Pare/commit/9251407ad98f72d8ecc772cc5ec34a0c4d97f961) Thanks [@Dave-London](https://github.com/Dave-London)! - feat(k8s): parse apply output into structured resources, parse describe Events and Conditions into structured arrays

- [#492](https://github.com/Dave-London/Pare/pull/492) [`99490d9`](https://github.com/Dave-London/Pare/commit/99490d9fc1515a33b130253062397ad38756e97a) Thanks [@Dave-London](https://github.com/Dave-London)! - feat(k8s): expand resource metadata, add helm history and template actions (P1)
  - Add annotations, ownerReferences, finalizers, resourceVersion, uid to K8sResourceSchema
  - Add helm `history` action for release revision history
  - Add helm `template` action for local chart template rendering

- [#463](https://github.com/Dave-London/Pare/pull/463) [`ca57bb6`](https://github.com/Dave-London/Pare/commit/ca57bb6af44d3b2d540f5266b64339086402a9e8) Thanks [@Dave-London](https://github.com/Dave-London)! - Add S-complexity gap parameters to K8s tools:
  - **get**: `fieldSelector`, `context`, `kubeconfig`, `sortBy`, `filename`, `subresource`
  - **describe**: Make `name` optional, add `selector`, `context`, `kubeconfig`
  - **apply**: Multi-file support (`string | string[]`), `validate` enum, `waitTimeout`, `fieldManager`, `context`, `selector`, `cascade` enum
  - **helm**: `version`, `waitTimeout`, multi-values (`string | string[]`), `filter`, `statusRevision`, `repo`, `description`
  - **logs**: `sinceTime`, `selector`, `context`, `podRunningTimeout`

- [#451](https://github.com/Dave-London/Pare/pull/451) [`1d0ee7b`](https://github.com/Dave-London/Pare/commit/1d0ee7b1b608b7ed0eb9c79e2979bdcfe65c79f8) Thanks [@Dave-London](https://github.com/Dave-London)! - Add missing CLI flag parameters from XS-complexity audit gaps
  - apply: serverSide, wait, recursive, kustomize, prune, force, forceConflicts
  - describe: allNamespaces, showEvents
  - get: ignoreNotFound, chunkSize
  - helm: dryRun, wait, atomic, createNamespace, installOnUpgrade, reuseValues, allNamespaces, showResources, noHooks, skipCrds
  - logs: timestamps, allContainers, limitBytes, prefix, ignoreErrors

### Patch Changes

- Updated dependencies [[`e69ccda`](https://github.com/Dave-London/Pare/commit/e69ccdaefb391d90a2616e9cf32fde5697df1173), [`0042862`](https://github.com/Dave-London/Pare/commit/0042862ddb9c6cd0b677244efffb5a7e18b3e915)]:
  - @paretools/shared@0.9.0

## 0.8.5

### Patch Changes

- Updated dependencies [[`7bb2541`](https://github.com/Dave-London/Pare/commit/7bb2541bfeaf27f1560ea1fdcecfff36dfb2068a)]:
  - @paretools/shared@0.8.5

## 0.8.4

### Patch Changes

- Updated dependencies [[`ac29d96`](https://github.com/Dave-London/Pare/commit/ac29d969a284ce14a67b45e24583cb57f591d210)]:
  - @paretools/shared@0.8.3

## 0.8.3

### Patch Changes

- Updated dependencies [[`2e4ad7f`](https://github.com/Dave-London/Pare/commit/2e4ad7f515a5e1763188ed02b09aabe9798bcfa7), [`89b3690`](https://github.com/Dave-London/Pare/commit/89b3690a73619f2481409db33964083d1e88c05b)]:
  - @paretools/shared@0.8.2

## 0.8.2

### Patch Changes

- [#400](https://github.com/Dave-London/Pare/pull/400) [`e5d12d5`](https://github.com/Dave-London/Pare/commit/e5d12d55484546888d3c9a7be9f1b26d2b927221) Thanks [@Dave-London](https://github.com/Dave-London)! - New packages: k8s (kubectl, helm), process (process-run), and security (trivy, semgrep, gitleaks).
