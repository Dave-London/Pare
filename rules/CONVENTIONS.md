# Pare — Aider Conventions

Pare is a suite of MCP servers that wrap CLI tools and return structured JSON.

## Important Note for Aider Users

Aider does not natively support MCP tools. To use Pare with Aider, you have two options:

1. **Use Pare CLI directly** — Run Pare tools from the terminal and paste the structured JSON output into the Aider chat when the agent needs CLI output.
2. **Use an MCP-capable agent alongside Aider** — Pair Aider with Claude Code, Cursor, or another MCP-enabled agent for CLI operations.

## Why Pare Over Raw CLI

- **Structured JSON output** — No need to parse text; fields are directly accessible.
- **Token savings** — JSON responses are typically 40-70% smaller than raw CLI output.
- **Reliability** — Consistent schema across invocations; no format changes between tool versions.

## Complete CLI to Pare Mapping

When running commands manually to provide output to Aider, prefer Pare equivalents:

### Git
`git status/log/diff/branch/show/add/commit/push/pull/checkout/tag/stash/remote/blame/restore/reset/cherry-pick/merge/rebase/reflog/bisect/worktree/submodule/archive/clean/config` -> `pare-git <sub>`

### GitHub
`gh pr/issue/run/release/label/repo/gist/discussion` -> `pare-github <sub>` (e.g., pr-view, issue-list, run-view, release-create)

### npm/pnpm/yarn
`npm install/audit/outdated/list/run/test/init/info/search` -> `pare-npm <sub>`

### Search
`grep`/`rg` -> `pare-search search` | `find`/`fd` -> `pare-search find` | `jq` -> `pare-search jq` | `yq` -> `pare-search yq`

### Lint
`eslint` -> `pare-lint lint` | `prettier` -> `pare-lint format-check/prettier-format` | `biome` -> `pare-lint biome-check/biome-format` | `stylelint/oxlint/shellcheck/hadolint` -> `pare-lint <tool>`

### Build
`tsc` -> `pare-build tsc` | `npm run build` -> `pare-build build` | `esbuild/vite/webpack/turbo/nx/lerna/rollup` -> `pare-build <tool>`

### Test
`vitest/jest/mocha/pytest` -> `pare-test run` | `vitest --coverage` -> `pare-test coverage` | `playwright` -> `pare-test playwright`

### Docker
`docker ps/build/logs/images/run/exec/pull/inspect/stats` -> `pare-docker <sub>` | `docker compose up/down/ps/logs/build` -> `pare-docker compose-<sub>` | `docker network ls` -> `pare-docker network-ls` | `docker volume ls` -> `pare-docker volume-ls`

### Cargo
`cargo build/test/clippy/run/add/remove/fmt/doc/check/update/tree/audit` -> `pare-cargo <sub>`

### Go
`go build/test/vet/run/fmt/generate/env/list/get` -> `pare-go <sub>` | `go mod tidy` -> `pare-go mod-tidy` | `golangci-lint` -> `pare-go golangci-lint`

### Python
`pip install/list/show` -> `pare-python pip-install/pip-list/pip-show` | `mypy` -> `pare-python mypy` | `ruff check/format` -> `pare-python ruff-check/ruff-format` | `black` -> `pare-python black` | `pytest` -> `pare-python pytest` | `uv install/run` -> `pare-python uv-install/uv-run` | `conda/pyenv/poetry` -> `pare-python <sub>`

### Kubernetes
`kubectl get/describe/logs/apply` -> `pare-k8s <sub>` | `helm` -> `pare-k8s helm`

### HTTP
`curl/wget` -> `pare-http request/get/post/head`

### Make
`make/just` -> `pare-make run/list`

### Security
`trivy/semgrep/gitleaks` -> `pare-security <tool>`

### General
Any command -> `pare-process run`
