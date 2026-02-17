# @paretools/go

## 0.9.0

### Minor Changes

- [#476](https://github.com/Dave-London/Pare/pull/476) [`37908b5`](https://github.com/Dave-London/Pare/commit/37908b587d75dd234ac81be96774ccb982460d40) Thanks [@Dave-London](https://github.com/Dave-London)! - fix(go): capture non-file build errors, fix fmt files-changed detection, populate test failure output, surface package-level test failures

- [#488](https://github.com/Dave-London/Pare/pull/488) [`c7be01b`](https://github.com/Dave-London/Pare/commit/c7be01bdad905c115533b9292f118a7bbbba7615) Thanks [@Dave-London](https://github.com/Dave-London)! - feat(go): add go/get version resolution, go/list modules mode, go/run output limits, go/vet JSON parsing

- [#495](https://github.com/Dave-London/Pare/pull/495) [`811edb3`](https://github.com/Dave-London/Pare/commit/811edb3dfcf7eb24b721c0cb118bd40e87d6c286) Thanks [@Dave-London](https://github.com/Dave-London)! - feat(go): improve env, fmt, generate, get, list, vet, golangci-lint, mod-tidy output (P1)
  - Improve env compact mode for filtered queries
  - Capture fmt stderr parse errors
  - Parse generate per-directive output
  - Add per-package status to get output
  - Capture golangci-lint Replacement/fix data
  - Capture list Error field per package
  - Distinguish mod-tidy "already tidy" from "made changes"
  - Add analyzer name to vet diagnostics

- [#460](https://github.com/Dave-London/Pare/pull/460) [`e314903`](https://github.com/Dave-London/Pare/commit/e314903cfd90724224b6ca39468867895f09e7e7) Thanks [@Dave-London](https://github.com/Dave-London)! - Add S-complexity gap implementations for Go tools:
  - build: add tags, ldflags, output, buildmode, gcflags params
  - env: add JSON parse error handling with success field, fix filtered vars mode
  - generate: add run, skip, tags params
  - get: add update enum param (all | patch)
  - golangci-lint: add newFromRev, enable/disable, timeout, buildTags, concurrency, maxIssuesPerLinter, maxSameIssues, presets params; add resultsTruncated schema field
  - list: add success field to schema, tags param, testGoFiles to package schema
  - mod-tidy: add goVersion, compat params
  - run: add tags, timeout, exec, maxOutput params; clarify buildArgs interaction with assertNoFlagInjection
  - test: add timeout, count, cover, coverprofile, tags, parallel, shuffle params
  - vet: add success field to schema, analyzers, tags, contextLines, vettool params

- [#452](https://github.com/Dave-London/Pare/pull/452) [`6878a0f`](https://github.com/Dave-London/Pare/commit/6878a0f4facb838648e062c4aea9170e7b674782) Thanks [@Dave-London](https://github.com/Dave-London)! - Add missing CLI flag parameters across all Go tools (XS complexity gaps)

- [#483](https://github.com/Dave-London/Pare/pull/483) [`6ad0dbf`](https://github.com/Dave-London/Pare/commit/6ad0dbf01d65d87bc3f8b383025d792fb0ab3ad2) Thanks [@Dave-London](https://github.com/Dave-London)! - Enrich output schemas for docker/compose-ps (structured ports), docker/pull (status enum), go/list (imports field), and python/ruff-format (filesUnchanged count)

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

- [#414](https://github.com/Dave-London/Pare/pull/414) [`89b3690`](https://github.com/Dave-London/Pare/commit/89b3690a73619f2481409db33964083d1e88c05b) Thanks [@Dave-London](https://github.com/Dave-London)! - Fix stale tool counts across all docs (62/100/112/139 → 147 tools, 14 → 16 packages) and add NVD links for CVE-2025-68144 and CVE-2025-68145 in validation.ts.

- Updated dependencies [[`2e4ad7f`](https://github.com/Dave-London/Pare/commit/2e4ad7f515a5e1763188ed02b09aabe9798bcfa7), [`89b3690`](https://github.com/Dave-London/Pare/commit/89b3690a73619f2481409db33964083d1e88c05b)]:
  - @paretools/shared@0.8.2

## 0.8.2

### Patch Changes

- [#400](https://github.com/Dave-London/Pare/pull/400) [`e5d12d5`](https://github.com/Dave-London/Pare/commit/e5d12d55484546888d3c9a7be9f1b26d2b927221) Thanks [@Dave-London](https://github.com/Dave-London)! - Add cargo-audit tool for Rust dependency auditing. Add golangci-lint tool for Go linting. Add jq tool for JSON processing.

## 0.8.1

### Patch Changes

- [#295](https://github.com/Dave-London/Pare/pull/295) [`5e11f81`](https://github.com/Dave-London/Pare/commit/5e11f81070c1c6dfd38030d088e0e4f3711219c3) Thanks [@Dave-London](https://github.com/Dave-London)! - Align remaining packages from 0.8.0 to 0.8.1 for consistent monorepo versioning.

## 0.8.0

### Minor Changes

- [#257](https://github.com/Dave-London/Pare/pull/257) [`b22708d`](https://github.com/Dave-London/Pare/commit/b22708dbdbdee9c34c4bfc3dad905190467cb294) Thanks [@Dave-London](https://github.com/Dave-London)! - Rebrand for MCP Registry: update mcpName to pare-\* prefix, add Pare-branded descriptions and server names to all server.json files, create server.json for github/http/make/search packages.

### Patch Changes

- [#259](https://github.com/Dave-London/Pare/pull/259) [`f6948f4`](https://github.com/Dave-London/Pare/commit/f6948f428a29cd9d74a338bcdb2c7c984d47d521) Thanks [@Dave-London](https://github.com/Dave-London)! - Align all packages to 0.8.1 for consistent versioning across the monorepo.

- Updated dependencies [[`b22708d`](https://github.com/Dave-London/Pare/commit/b22708dbdbdee9c34c4bfc3dad905190467cb294)]:
  - @paretools/shared@0.8.1

## 0.7.1

### Patch Changes

- Updated dependencies []:
  - @paretools/shared@0.8.0

## 0.7.0

### Minor Changes

- v0.7.0 — 100 tools, 14 packages

  New packages:
  - `@paretools/github` — 8 tools wrapping the `gh` CLI (pr-view, pr-list, pr-create, issue-view, issue-list, issue-create, run-view, run-list)
  - `@paretools/search` — 3 tools wrapping ripgrep and fd (search, find, count)
  - `@paretools/http` — 4 tools wrapping curl (request, get, post, head)
  - `@paretools/make` — 2 tools wrapping make and just (run, list)

  Expanded servers:
  - `@paretools/git` +5 tools: tag, stash-list, stash, remote, blame
  - `@paretools/docker` +4 tools: inspect, network-ls, volume-ls, compose-ps
  - `@paretools/go` +3 tools: env, list, get
  - `@paretools/python` +3 tools: pip-list, pip-show, ruff-format
  - `@paretools/npm` +2 tools: info, search
  - `@paretools/cargo` +2 tools: update, tree
  - `@paretools/lint` +2 tools: stylelint, oxlint

  Cross-cutting:
  - `@paretools/shared` — granular tool selection via `PARE_TOOLS` and `PARE_{SERVER}_TOOLS` environment variables (#111)

### Patch Changes

- Updated dependencies []:
  - @paretools/shared@0.7.0

## 0.6.0

### Minor Changes

- [`975d319`](https://github.com/Dave-London/Pare/commit/975d319bec6b7511066b4463cd24eb49a1c91a90) Thanks [@Dave-London](https://github.com/Dave-London)! - ### Automatic compact mode

  All 9 servers now support automatic compact mode. When structured JSON output would exceed the raw CLI token count, Pare automatically applies a compact projection — keeping essential fields and dropping verbose details like stack traces, individual diagnostics, and file-level stats. This ensures Pare always uses fewer tokens than raw CLI output. Each tool accepts a `compact` parameter (default: `true`) to opt out if needed.

  ### Security hardening
  - Block dangerous Docker volume mounts (`/`, `/etc`, `/var/run/docker.sock`)
  - Default `ignoreScripts: true` for npm install
  - Validate all `args[]` arrays against flag injection
  - Windows `cmd.exe` delayed expansion escaping
  - Zod input size limits on all string/array parameters
  - Error message sanitization to prevent path leakage

  ### Reliability
  - Increased default `run()` timeout from 30s to 60s
  - Fixed flaky Windows test timeouts

### Patch Changes

- Updated dependencies [[`975d319`](https://github.com/Dave-London/Pare/commit/975d319bec6b7511066b4463cd24eb49a1c91a90)]:
  - @paretools/shared@0.6.0

## 0.5.0

### Minor Changes

- v0.5.0 release — 62 tools across 9 language servers.

  ### New Tools (since v0.3.0)
  - **git**: add, commit, push, pull, checkout (full git workflow)
  - **docker**: run, exec, compose-up, compose-down, pull (full container lifecycle)
  - **cargo**: run, add, remove, fmt, doc, check (full Rust workflow)
  - **python**: pytest, uv-install, uv-run, black (testing + formatting)
  - **npm**: run, test, init (script execution + project scaffolding)
  - **go**: run, mod-tidy, fmt, generate (full Go workflow)
  - **build**: esbuild, vite-build, webpack (bundler support)
  - **lint**: prettier-format, biome-check, biome-format (Biome + write mode)

  ### Testing
  - Expanded test suite from 305 to 1,334 tests across 80+ files
  - Added fidelity, integration, and runner tests for all packages

  ### Discoverability
  - Updated all per-package READMEs with complete tool listings, badges, and cross-references
  - Expanded npm keywords for better search visibility
  - Added CI, version, license, and Node.js badges to root README

### Patch Changes

- Updated dependencies []:
  - @paretools/shared@0.5.0

## 0.3.0

### Minor Changes

- [#31](https://github.com/Dave-London/pare/pull/31) [`2ccda44`](https://github.com/Dave-London/pare/commit/2ccda44c5118a91692da215d968ef1b178b4a547) Thanks [@Dave-London](https://github.com/Dave-London)! - Security, discoverability, and test coverage improvements.

  ### Security
  - Fix git argument injection: block ref/branch params starting with `-`
  - Fix build command injection: allowlist of 24 known build tools
  - New `assertNoFlagInjection` and `assertAllowedCommand` validation utilities

  ### Features
  - Add MCP `instructions` field to all 9 servers for better client guidance
  - Optimize tool descriptions with "Use instead of" phrasing for agent discoverability
  - Increase default timeouts for build/install operations (5 min for docker, npm, cargo, go)

  ### Testing
  - Expand test suite from 146 to 305 tests
  - Add fidelity tests proving no information loss in git and vitest parsers
  - Add formatter, integration, and validation tests across all packages

  ### Infrastructure
  - Add `mcpName` field for Official MCP Registry compatibility
  - Add Smithery registry configs for all 9 servers
  - Add Dependabot, CODEOWNERS, FUNDING.yml, feature-request template
  - Expand README with per-client configs, agent snippets, and troubleshooting

### Patch Changes

- Updated dependencies [[`2ccda44`](https://github.com/Dave-London/pare/commit/2ccda44c5118a91692da215d968ef1b178b4a547)]:
  - @paretools/shared@0.3.0

## 0.2.0

### Minor Changes

- [#10](https://github.com/Dave-London/pare/pull/10) [`d08cf3d`](https://github.com/Dave-London/pare/commit/d08cf3d967e6a8ff9d65928aeed767fcf13f024d) Thanks [@Dave-London](https://github.com/Dave-London)! - Initial release of all Pare MCP servers

### Patch Changes

- Updated dependencies [[`d08cf3d`](https://github.com/Dave-London/pare/commit/d08cf3d967e6a8ff9d65928aeed767fcf13f024d)]:
  - @paretools/shared@0.2.0
