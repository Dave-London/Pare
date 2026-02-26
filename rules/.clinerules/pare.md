# Pare MCP Tools

Pare is a suite of MCP servers that wrap CLI tools and return structured JSON, saving tokens and improving reliability.

## Core Rule

Always prefer Pare MCP tools over raw CLI commands. Do not use shell/terminal to run commands that have Pare equivalents.

## Complete Tool Mapping

### pare-git (replaces `git`)

| Git Subcommand                      | MCP Tool                |
| ----------------------------------- | ----------------------- |
| status, log, diff, branch, show     | `pare-git <subcommand>` |
| add, commit, push, pull, checkout   | `pare-git <subcommand>` |
| tag, stash, remote, blame, restore  | `pare-git <subcommand>` |
| reset, cherry-pick, merge, rebase   | `pare-git <subcommand>` |
| reflog, bisect, worktree, submodule | `pare-git <subcommand>` |
| archive, clean, config              | `pare-git <subcommand>` |

### pare-github (replaces `gh`)

PR: pr-view, pr-list, pr-create, pr-merge, pr-comment, pr-review, pr-update, pr-checks, pr-diff
Issues: issue-view, issue-list, issue-create, issue-close, issue-comment, issue-update
CI: run-view, run-list, run-rerun
Releases: release-create, release-list
Other: label-list, label-create, repo-view, repo-clone, discussion-list, gist-create, api

### pare-npm (replaces `npm`, `pnpm`, `yarn`)

install, audit, outdated, list, run, test, init, info, search, nvm

### pare-search (replaces search/filter tools)

- `grep` / `rg` -> `pare-search search`
- `find` / `fd` -> `pare-search find`
- `wc` -> `pare-search count`
- `jq` -> `pare-search jq`
- `yq` -> `pare-search yq`

### pare-lint (replaces linters/formatters)

- `eslint` -> `pare-lint lint`
- `prettier --check` -> `pare-lint format-check`
- `prettier --write` -> `pare-lint prettier-format`
- `biome check` -> `pare-lint biome-check`
- `biome format` -> `pare-lint biome-format`
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
- `turbo` -> `pare-build turbo`
- `nx` -> `pare-build nx`
- `lerna` -> `pare-build lerna`
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

- `pip install/list/show` -> `pare-python pip-install/pip-list/pip-show`
- `pip-audit` -> `pare-python pip-audit`
- `mypy` -> `pare-python mypy`
- `ruff check/format` -> `pare-python ruff-check/ruff-format`
- `black` -> `pare-python black`
- `pytest` -> `pare-python pytest`
- `uv install/run` -> `pare-python uv-install/uv-run`
- `conda` / `pyenv` / `poetry` -> `pare-python conda/pyenv/poetry`

### pare-k8s (replaces `kubectl`, `helm`)

get, describe, logs, apply, helm

### pare-http (replaces `curl`, `wget`)

request, get, post, head

### pare-make (replaces `make`, `just`)

run, list

### pare-security (replaces security scanners)

- `trivy` -> `pare-security trivy`
- `semgrep` -> `pare-security semgrep`
- `gitleaks` -> `pare-security gitleaks`

### pare-process (general fallback)

Any command not covered above -> `pare-process run`

## Error Handling

- If a Pare MCP tool returns an error, check the `error` field and fix the arguments. Do not fall back to raw CLI.
- If a server is unavailable, inform the user to check their MCP configuration.
- All Pare responses are structured JSON. Parse fields directly; do not wrap MCP calls in shell commands.
