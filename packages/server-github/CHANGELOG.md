# @paretools/github

## 0.10.0

### Minor Changes

- [#528](https://github.com/Dave-London/Pare/pull/528) [`65697bf`](https://github.com/Dave-London/Pare/commit/65697bff5f751ff8990e154512ed5c58f54710e6) Thanks [@Dave-London](https://github.com/Dave-London)! - Add label-list and label-create tools for repository label management. Fix run-view bug where --log/--log-failed flags conflicted with --json, causing JSON parse crashes.

### Patch Changes

- [#547](https://github.com/Dave-London/Pare/pull/547) [`3a6f31c`](https://github.com/Dave-London/Pare/commit/3a6f31c92a3507388dacbf1fd69afa3f76e032e2) Thanks [@Dave-London](https://github.com/Dave-London)! - Fix shell escaping for pr-merge commitBody by using --body-file - with stdin instead of --body CLI arg

- [`ba6fab4`](https://github.com/Dave-London/Pare/commit/ba6fab4014061ea402885779b7f3a4762477d71d) - Fix release-create to use --notes-file stdin for shell-safe body handling

- [#552](https://github.com/Dave-London/Pare/pull/552) [`a618e9f`](https://github.com/Dave-London/Pare/commit/a618e9f733b179583355ad32f8558a7fd866661e) Thanks [@Dave-London](https://github.com/Dave-London)! - Improve reliability for long-running test and GitHub CLI workflows.
  - `@paretools/test`:
    - Raise test CLI wrapper timeout policy to 5 minutes (`300_000ms`) for `run`, `coverage`, and `playwright`
    - Increase package Vitest timeout to `300_000ms`
    - Split test execution into `test:unit`, `test:integration`, and `test:fidelity` with sequential `test` orchestration
    - Auto-build required dist artifacts for integration-style tests to avoid stale-build false failures
    - Document timeout and test-batching policy in README
  - `@paretools/github`:
    - Run `gh` with `shell: false` to avoid Windows shell escaping quirks for native executable invocation
    - Add unit coverage for `gh` runner invocation options

- Updated dependencies [[`3a6f31c`](https://github.com/Dave-London/Pare/commit/3a6f31c92a3507388dacbf1fd69afa3f76e032e2)]:
  - @paretools/shared@0.10.0

## 0.9.0

### Minor Changes

- [#462](https://github.com/Dave-London/Pare/pull/462) [`e494cb2`](https://github.com/Dave-London/Pare/commit/e494cb233dd873b7752de5254abacbddaa45d659) Thanks [@Dave-London](https://github.com/Dave-London)! - feat(github): implement S-complexity gaps — add validated params, enums, and output schema enhancements

- [#486](https://github.com/Dave-London/Pare/pull/486) [`982d087`](https://github.com/Dave-London/Pare/commit/982d0877fecb03d2aa1bed95b45426a44d719623) Thanks [@Dave-London](https://github.com/Dave-London)! - feat(github,docker): add gist path validation, issue-create body stdin, docker/images filter, docker/inspect image support

- [#480](https://github.com/Dave-London/Pare/pull/480) [`ec8311c`](https://github.com/Dave-London/Pare/commit/ec8311c1fcbc31ac1b72baa20e4dd528c27d3e76) Thanks [@Dave-London](https://github.com/Dave-London)! - feat(github): add HTTP status to api, deduplicate pr-checks, add binary field to pr-diff, expand pr-merge state and run-view metadata

- [#474](https://github.com/Dave-London/Pare/pull/474) [`8223d10`](https://github.com/Dave-London/Pare/commit/8223d107360a27170f4e907ebc0e8477a6d284ce) Thanks [@Dave-London](https://github.com/Dave-London)! - fix(github): improve issue-close URL parsing robustness and handle pr-checks exit code 8 (pending checks)

- [#496](https://github.com/Dave-London/Pare/pull/496) [`7629857`](https://github.com/Dave-London/Pare/commit/7629857cc00ecce9f089eccc95212afae04c36ee) Thanks [@Dave-London](https://github.com/Dave-London)! - feat(github): improve api, gist, issue, pr, run tools output (P1)
  - Preserve API error body in api tool
  - Add GraphQL support to api tool
  - Add content-based gist creation
  - Detect already-closed issues in issue-close
  - Parse review event from pr-review output
  - Add error classification to pr-review
  - Add reviews details to pr-view
  - Expand run-list with headSha, event, startedAt, attempt
  - Add rerun attempt tracking to run-rerun

- [#449](https://github.com/Dave-London/Pare/pull/449) [`492097f`](https://github.com/Dave-London/Pare/commit/492097f3375fabd095177ce1b6f62be7cb6a59b9) Thanks [@Dave-London](https://github.com/Dave-London)! - Add missing CLI flag parameters across all GitHub tools (XS complexity gaps)

### Patch Changes

- [#504](https://github.com/Dave-London/Pare/pull/504) [`e69ccda`](https://github.com/Dave-London/Pare/commit/e69ccdaefb391d90a2616e9cf32fde5697df1173) Thanks [@Dave-London](https://github.com/Dave-London)! - fix CI: add docker formatter tests for branch coverage, skip Windows symlink tests, remove unused eslint-disable

- [#506](https://github.com/Dave-London/Pare/pull/506) [`6500911`](https://github.com/Dave-London/Pare/commit/65009118148110678f4aa5aee7fe8f30f2de85bf) Thanks [@Dave-London](https://github.com/Dave-London)! - fix(github): replace z.union with z.string for number params to fix MCP SDK validation

- [#510](https://github.com/Dave-London/Pare/pull/510) [`c29206d`](https://github.com/Dave-London/Pare/commit/c29206d03cfc8c2653a239a839adc89ce24b7508) Thanks [@Dave-London](https://github.com/Dave-London)! - Fix pr-checks failing due to unsupported `isRequired` and `conclusion` JSON fields, and rename `pr` parameter to `number` in pr-checks and pr-diff for consistency with other PR tools.

- [#440](https://github.com/Dave-London/Pare/pull/440) [`d64e6fd`](https://github.com/Dave-London/Pare/commit/d64e6fd423439b18b2f285bdad160041eb3ca5a7) Thanks [@Dave-London](https://github.com/Dave-London)! - Fix tool bugs found while dogfooding:
  - Add `admin` option to pr-merge for bypassing branch protection
  - Fix pull tool divergent branches by always passing explicit merge strategy
  - Fix push tool setUpstream by auto-detecting current branch name
  - Add `coverage` boolean to test run tool for running tests with coverage

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

- [#400](https://github.com/Dave-London/Pare/pull/400) [`e5d12d5`](https://github.com/Dave-London/Pare/commit/e5d12d55484546888d3c9a7be9f1b26d2b927221) Thanks [@Dave-London](https://github.com/Dave-London)! - Add run-rerun, pr-checks, pr-diff, gh-api, gist-create, release-create, and release-list tools.

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
