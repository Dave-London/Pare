# @paretools/make

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

- [#400](https://github.com/Dave-London/Pare/pull/400) [`e5d12d5`](https://github.com/Dave-London/Pare/commit/e5d12d55484546888d3c9a7be9f1b26d2b927221) Thanks [@Dave-London](https://github.com/Dave-London)! - Document tool schemas for http and make tools.

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
