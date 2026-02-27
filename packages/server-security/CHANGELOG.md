# @paretools/security

## 0.13.1

### Patch Changes

- Updated dependencies [[`79d528d`](https://github.com/Dave-London/Pare/commit/79d528d6bba90ac1f3bda016ab57058fda293a4d), [`d2be342`](https://github.com/Dave-London/Pare/commit/d2be34264a37b92a29d1ef74c201e99e07df7485)]:
  - @paretools/shared@0.13.1

## 0.13.0

### Minor Changes

- [#634](https://github.com/Dave-London/Pare/pull/634) [`d280e88`](https://github.com/Dave-London/Pare/commit/d280e888c2025c607de8f07183dc9b333f66254d) Thanks [@Dave-London](https://github.com/Dave-London)! - Implement lazy tool registration: when `PARE_LAZY=true`, only core tools are registered at startup while extended tools are deferred and discoverable via the new `discover-tools` meta-tool. Reduces token cost of tool schemas in LLM prompts by loading rarely-used tools on demand.

- [#628](https://github.com/Dave-London/Pare/pull/628) [`a4b6fec`](https://github.com/Dave-London/Pare/commit/a4b6fec2badb5aa596215dc3b8971399195d2df5) Thanks [@Dave-London](https://github.com/Dave-London)! - Optimize output schemas across all 16 server packages: remove derivable counts, echo-back fields, timing/duration data, and human-display metadata from Zod schemas. Move display-only data to formatters for human-readable output. Ensures compact maps only return schema-compatible fields to prevent `additionalProperties` validation failures.

### Patch Changes

- Updated dependencies [[`d280e88`](https://github.com/Dave-London/Pare/commit/d280e888c2025c607de8f07183dc9b333f66254d), [`a4b6fec`](https://github.com/Dave-London/Pare/commit/a4b6fec2badb5aa596215dc3b8971399195d2df5)]:
  - @paretools/shared@0.13.0

## 0.12.0

### Patch Changes

- [#601](https://github.com/Dave-London/Pare/pull/601) [`6eac155`](https://github.com/Dave-London/Pare/commit/6eac155d9e4efbe4ba5cc43c33622dccf5ffe09c) Thanks [@Dave-London](https://github.com/Dave-London)! - Extract common MCP server boilerplate into a `createServer()` factory in `@paretools/shared`. All server packages now use this factory instead of duplicating McpServer setup, StdioServerTransport connection, and tool registration code.

- Updated dependencies [[`6eac155`](https://github.com/Dave-London/Pare/commit/6eac155d9e4efbe4ba5cc43c33622dccf5ffe09c)]:
  - @paretools/shared@0.12.0

## 0.11.0

### Patch Changes

- Updated dependencies [[`154f567`](https://github.com/Dave-London/Pare/commit/154f5678d69df15db746d0fc8afbcc2ecc17ac85), [`a069792`](https://github.com/Dave-London/Pare/commit/a069792ad77be8c159fcf9b72ffc6036ff9d25dd)]:
  - @paretools/shared@0.11.0

## 0.10.2

### Patch Changes

- [#570](https://github.com/Dave-London/Pare/pull/570) [`0c50be7`](https://github.com/Dave-London/Pare/commit/0c50be7760bc21ef20e735cef3da065ba93bb36d) Thanks [@Dave-London](https://github.com/Dave-London)! - Add `bugs` URL to package.json for all packages, linking to the GitHub issues page.

- Updated dependencies [[`0c50be7`](https://github.com/Dave-London/Pare/commit/0c50be7760bc21ef20e735cef3da065ba93bb36d)]:
  - @paretools/shared@0.10.2

## 0.10.1

### Patch Changes

- [#565](https://github.com/Dave-London/Pare/pull/565) [`da71ee5`](https://github.com/Dave-London/Pare/commit/da71ee56c5626d929a28ce1838019a12d496187b) Thanks [@Dave-London](https://github.com/Dave-London)! - Fix flag injection guards that incorrectly blocked legitimate values: git sort keys (e.g. `-creatordate`), gitleaks `logOpts` (e.g. `--since=2024-01-01`), and remove misleading validation claim from turbo `args` description.

- Updated dependencies [[`da71ee5`](https://github.com/Dave-London/Pare/commit/da71ee56c5626d929a28ce1838019a12d496187b)]:
  - @paretools/shared@0.10.1

## 0.10.0

### Patch Changes

- Updated dependencies [[`3a6f31c`](https://github.com/Dave-London/Pare/commit/3a6f31c92a3507388dacbf1fd69afa3f76e032e2)]:
  - @paretools/shared@0.10.0

## 0.9.0

### Minor Changes

- [#472](https://github.com/Dave-London/Pare/pull/472) [`2df220c`](https://github.com/Dave-London/Pare/commit/2df220c53ccb367442e58ffb6464321ad9baec62) Thanks [@Dave-London](https://github.com/Dave-London)! - Implement S-complexity gaps for security tools
  - gitleaks: Add redact (default: true), config, baselinePath, logOpts, enableRule params
  - semgrep: Change config to accept string | string[] for repeatable --config; add exclude, include, excludeRule, baselineCommit params
  - trivy: Change severity to accept single value or array/CSV; add scanners, vulnType, skipDirs, skipFiles, platform, ignorefile params

- [#454](https://github.com/Dave-London/Pare/pull/454) [`537e0d6`](https://github.com/Dave-London/Pare/commit/537e0d6708ae1197aaaedcb8ca2d22f8e28b1d0d) Thanks [@Dave-London](https://github.com/Dave-London)! - Add missing CLI flag parameters from XS-complexity audit gaps
  - trivy: assertNoFlagInjection on target, exitCode, skipDbUpdate
  - semgrep: dataflowTraces, autofix, dryrun, maxTargetBytes, jobs
  - gitleaks: followSymlinks, maxTargetMegabytes, logLevel, exitCode

### Patch Changes

- Updated dependencies [[`e69ccda`](https://github.com/Dave-London/Pare/commit/e69ccdaefb391d90a2616e9cf32fde5697df1173), [`0042862`](https://github.com/Dave-London/Pare/commit/0042862ddb9c6cd0b677244efffb5a7e18b3e915)]:
  - @paretools/shared@0.9.0

## 0.8.5

### Patch Changes

- Updated dependencies [[`7bb2541`](https://github.com/Dave-London/Pare/commit/7bb2541bfeaf27f1560ea1fdcecfff36dfb2068a)]:
  - @paretools/shared@0.8.5

## 0.1.3

### Patch Changes

- Updated dependencies [[`ac29d96`](https://github.com/Dave-London/Pare/commit/ac29d969a284ce14a67b45e24583cb57f591d210)]:
  - @paretools/shared@0.8.3

## 0.1.2

### Patch Changes

- Updated dependencies [[`2e4ad7f`](https://github.com/Dave-London/Pare/commit/2e4ad7f515a5e1763188ed02b09aabe9798bcfa7), [`89b3690`](https://github.com/Dave-London/Pare/commit/89b3690a73619f2481409db33964083d1e88c05b)]:
  - @paretools/shared@0.8.2

## 0.1.1

### Patch Changes

- [#400](https://github.com/Dave-London/Pare/pull/400) [`e5d12d5`](https://github.com/Dave-London/Pare/commit/e5d12d55484546888d3c9a7be9f1b26d2b927221) Thanks [@Dave-London](https://github.com/Dave-London)! - New packages: k8s (kubectl, helm), process (process-run), and security (trivy, semgrep, gitleaks).
