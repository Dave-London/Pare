# Pare MCP Tools

Pare is a suite of MCP servers that wrap CLI tools and return structured JSON, saving tokens and improving reliability.

## Core Rule

Always prefer Pare MCP tools over raw CLI commands. Every shell call to a supported tool should be replaced with the corresponding Pare MCP tool call.

## Tool Mapping

### pare-git (replaces `git`)
Subcommands: status, log, diff, branch, show, add, commit, push, pull, checkout, tag, stash, remote, blame, restore, reset, cherry-pick, merge, rebase, reflog, bisect, worktree, submodule, archive, clean, config

### pare-github (replaces `gh`)
PR: pr-view, pr-list, pr-create, pr-merge, pr-comment, pr-review, pr-update, pr-checks, pr-diff
Issues: issue-view, issue-list, issue-create, issue-close, issue-comment, issue-update
CI: run-view, run-list, run-rerun
Releases: release-create, release-list
Other: label-list, label-create, repo-view, repo-clone, discussion-list, gist-create, api

### pare-npm (replaces `npm`, `pnpm`, `yarn`)
install, audit, outdated, list, run, test, init, info, search, nvm

### pare-search (replaces search tools)
- `grep` / `rg` -> `pare-search search`
- `find` / `fd` -> `pare-search find`
- `wc` -> `pare-search count`
- `jq` -> `pare-search jq`
- `yq` -> `pare-search yq`

### pare-lint (replaces linters/formatters)
- `eslint` -> `pare-lint lint`
- `prettier --check` -> `pare-lint format-check`
- `prettier --write` -> `pare-lint prettier-format`
- `biome check/format` -> `pare-lint biome-check/biome-format`
- `stylelint` -> `pare-lint stylelint`
- `oxlint` -> `pare-lint oxlint`
- `shellcheck` -> `pare-lint shellcheck`
- `hadolint` -> `pare-lint hadolint`

### pare-build (replaces build tools)
- `tsc` -> `pare-build tsc`
- `npm run build` -> `pare-build build`
- `esbuild` -> `pare-build esbuild`
- `vite build` -> `pare-build vite-build`
- `webpack` -> `pare-build webpack`
- `turbo/nx/lerna` -> `pare-build turbo/nx/lerna`
- `rollup` -> `pare-build rollup`

### pare-test (replaces test runners)
- `vitest` / `jest` / `mocha` / `pytest` -> `pare-test run`
- `vitest --coverage` -> `pare-test coverage`
- `playwright test` -> `pare-test playwright`

### pare-docker (replaces `docker`)
Container: ps, build, logs, images, run, exec, pull, inspect, stats
Compose: compose-up, compose-down, compose-ps, compose-logs, compose-build
Network/Volume: network-ls, volume-ls

### pare-cargo (replaces `cargo`)
build, test, clippy, run, add, remove, fmt, doc, check, update, tree, audit

### pare-go (replaces `go`, `golangci-lint`)
build, test, vet, run, mod-tidy, fmt, generate, env, list, get, golangci-lint

### pare-python (replaces Python tools)
- `pip` -> `pare-python pip-install/pip-list/pip-show/pip-audit`
- `mypy` -> `pare-python mypy`
- `ruff` -> `pare-python ruff-check/ruff-format`
- `black` -> `pare-python black`
- `pytest` -> `pare-python pytest`
- `uv` -> `pare-python uv-install/uv-run`
- `conda/pyenv/poetry` -> `pare-python conda/pyenv/poetry`

### pare-k8s (replaces `kubectl`, `helm`)
get, describe, logs, apply, helm

### pare-http (replaces `curl`, `wget`)
request, get, post, head

### pare-make (replaces `make`, `just`)
run, list

### pare-security (replaces security scanners)
trivy, semgrep, gitleaks -> `pare-security <tool>`

### pare-process (general fallback)
Any command not covered above -> `pare-process run`

## Error Handling

- On MCP error, check the `error` field and fix arguments. Do not fall back to raw CLI.
- If a server is unavailable, inform the user to check their MCP configuration.
- All responses are structured JSON. Parse fields directly; never wrap MCP calls in shell commands.
