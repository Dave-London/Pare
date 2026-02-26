# Pare MCP Tools — Claude Code Instructions

Pare is a suite of MCP servers that wrap CLI tools and return structured JSON, saving tokens and improving reliability.

## Core Rule

Always prefer Pare MCP tools over raw CLI commands. Every Bash call to a supported CLI tool should be replaced with the corresponding Pare MCP tool call.

## CLI to MCP Tool Mapping

### Git (`pare-git`)

| CLI Command | MCP Tool |
|---|---|
| `git status` | `pare-git status` |
| `git log` | `pare-git log` |
| `git diff` | `pare-git diff` |
| `git branch` | `pare-git branch` |
| `git show` | `pare-git show` |
| `git add` | `pare-git add` |
| `git commit` | `pare-git commit` |
| `git push` | `pare-git push` |
| `git pull` | `pare-git pull` |
| `git checkout` | `pare-git checkout` |
| `git tag` | `pare-git tag` |
| `git stash` | `pare-git stash` |
| `git remote` | `pare-git remote` |
| `git blame` | `pare-git blame` |
| `git restore` | `pare-git restore` |
| `git reset` | `pare-git reset` |
| `git cherry-pick` | `pare-git cherry-pick` |
| `git merge` | `pare-git merge` |
| `git rebase` | `pare-git rebase` |
| `git reflog` | `pare-git reflog` |
| `git bisect` | `pare-git bisect` |
| `git worktree` | `pare-git worktree` |
| `git submodule` | `pare-git submodule` |
| `git archive` | `pare-git archive` |
| `git clean` | `pare-git clean` |
| `git config` | `pare-git config` |

### GitHub (`pare-github`)

| CLI Command | MCP Tool |
|---|---|
| `gh pr view` | `pare-github pr-view` |
| `gh pr list` | `pare-github pr-list` |
| `gh pr create` | `pare-github pr-create` |
| `gh pr merge` | `pare-github pr-merge` |
| `gh pr comment` | `pare-github pr-comment` |
| `gh pr review` | `pare-github pr-review` |
| `gh pr update` | `pare-github pr-update` |
| `gh pr checks` | `pare-github pr-checks` |
| `gh pr diff` | `pare-github pr-diff` |
| `gh issue view` | `pare-github issue-view` |
| `gh issue list` | `pare-github issue-list` |
| `gh issue create` | `pare-github issue-create` |
| `gh issue close` | `pare-github issue-close` |
| `gh issue comment` | `pare-github issue-comment` |
| `gh issue update` | `pare-github issue-update` |
| `gh run view` | `pare-github run-view` |
| `gh run list` | `pare-github run-list` |
| `gh run rerun` | `pare-github run-rerun` |
| `gh release create` | `pare-github release-create` |
| `gh release list` | `pare-github release-list` |
| `gh label list` | `pare-github label-list` |
| `gh label create` | `pare-github label-create` |
| `gh repo view` | `pare-github repo-view` |
| `gh repo clone` | `pare-github repo-clone` |
| `gh discussion list` | `pare-github discussion-list` |
| `gh gist create` | `pare-github gist-create` |
| `gh api` | `pare-github api` |

### npm/pnpm/yarn (`pare-npm`)

| CLI Command | MCP Tool |
|---|---|
| `npm install` | `pare-npm install` |
| `npm audit` | `pare-npm audit` |
| `npm outdated` | `pare-npm outdated` |
| `npm list` | `pare-npm list` |
| `npm run` | `pare-npm run` |
| `npm test` | `pare-npm test` |
| `npm init` | `pare-npm init` |
| `npm info` | `pare-npm info` |
| `npm search` | `pare-npm search` |
| `nvm` | `pare-npm nvm` |

### Search (`pare-search`)

| CLI Command | MCP Tool |
|---|---|
| `grep` / `rg` | `pare-search search` |
| `find` / `fd` | `pare-search find` |
| `wc` (counting) | `pare-search count` |
| `jq` | `pare-search jq` |
| `yq` | `pare-search yq` |

### Lint (`pare-lint`)

| CLI Command | MCP Tool |
|---|---|
| `eslint` | `pare-lint lint` |
| `prettier --check` | `pare-lint format-check` |
| `prettier --write` | `pare-lint prettier-format` |
| `biome check` | `pare-lint biome-check` |
| `biome format` | `pare-lint biome-format` |
| `stylelint` | `pare-lint stylelint` |
| `oxlint` | `pare-lint oxlint` |
| `shellcheck` | `pare-lint shellcheck` |
| `hadolint` | `pare-lint hadolint` |

### Build (`pare-build`)

| CLI Command | MCP Tool |
|---|---|
| `tsc` | `pare-build tsc` |
| `npm run build` | `pare-build build` |
| `esbuild` | `pare-build esbuild` |
| `vite build` | `pare-build vite-build` |
| `webpack` | `pare-build webpack` |
| `turbo` | `pare-build turbo` |
| `nx` | `pare-build nx` |
| `lerna` | `pare-build lerna` |
| `rollup` | `pare-build rollup` |

### Test (`pare-test`)

| CLI Command | MCP Tool |
|---|---|
| `vitest` / `jest` / `mocha` / `pytest` | `pare-test run` |
| `vitest --coverage` | `pare-test coverage` |
| `playwright test` | `pare-test playwright` |

### Docker (`pare-docker`)

| CLI Command | MCP Tool |
|---|---|
| `docker ps` | `pare-docker ps` |
| `docker build` | `pare-docker build` |
| `docker logs` | `pare-docker logs` |
| `docker images` | `pare-docker images` |
| `docker run` | `pare-docker run` |
| `docker exec` | `pare-docker exec` |
| `docker pull` | `pare-docker pull` |
| `docker inspect` | `pare-docker inspect` |
| `docker stats` | `pare-docker stats` |
| `docker compose up` | `pare-docker compose-up` |
| `docker compose down` | `pare-docker compose-down` |
| `docker compose ps` | `pare-docker compose-ps` |
| `docker compose logs` | `pare-docker compose-logs` |
| `docker compose build` | `pare-docker compose-build` |
| `docker network ls` | `pare-docker network-ls` |
| `docker volume ls` | `pare-docker volume-ls` |

### Cargo (`pare-cargo`)

| CLI Command | MCP Tool |
|---|---|
| `cargo build` | `pare-cargo build` |
| `cargo test` | `pare-cargo test` |
| `cargo clippy` | `pare-cargo clippy` |
| `cargo run` | `pare-cargo run` |
| `cargo add` | `pare-cargo add` |
| `cargo remove` | `pare-cargo remove` |
| `cargo fmt` | `pare-cargo fmt` |
| `cargo doc` | `pare-cargo doc` |
| `cargo check` | `pare-cargo check` |
| `cargo update` | `pare-cargo update` |
| `cargo tree` | `pare-cargo tree` |
| `cargo audit` | `pare-cargo audit` |

### Go (`pare-go`)

| CLI Command | MCP Tool |
|---|---|
| `go build` | `pare-go build` |
| `go test` | `pare-go test` |
| `go vet` | `pare-go vet` |
| `go run` | `pare-go run` |
| `go mod tidy` | `pare-go mod-tidy` |
| `go fmt` | `pare-go fmt` |
| `go generate` | `pare-go generate` |
| `go env` | `pare-go env` |
| `go list` | `pare-go list` |
| `go get` | `pare-go get` |
| `golangci-lint` | `pare-go golangci-lint` |

### Python (`pare-python`)

| CLI Command | MCP Tool |
|---|---|
| `pip install` | `pare-python pip-install` |
| `pip list` | `pare-python pip-list` |
| `pip show` | `pare-python pip-show` |
| `pip-audit` | `pare-python pip-audit` |
| `mypy` | `pare-python mypy` |
| `ruff check` | `pare-python ruff-check` |
| `ruff format` | `pare-python ruff-format` |
| `black` | `pare-python black` |
| `pytest` | `pare-python pytest` |
| `uv install` | `pare-python uv-install` |
| `uv run` | `pare-python uv-run` |
| `conda` | `pare-python conda` |
| `pyenv` | `pare-python pyenv` |
| `poetry` | `pare-python poetry` |

### Kubernetes (`pare-k8s`)

| CLI Command | MCP Tool |
|---|---|
| `kubectl get` | `pare-k8s get` |
| `kubectl describe` | `pare-k8s describe` |
| `kubectl logs` | `pare-k8s logs` |
| `kubectl apply` | `pare-k8s apply` |
| `helm` | `pare-k8s helm` |

### HTTP (`pare-http`)

| CLI Command | MCP Tool |
|---|---|
| `curl` / `wget` | `pare-http request` |
| `curl -X GET` | `pare-http get` |
| `curl -X POST` | `pare-http post` |
| `curl -I` | `pare-http head` |

### Make (`pare-make`)

| CLI Command | MCP Tool |
|---|---|
| `make <target>` / `just <target>` | `pare-make run` |
| `make -n` (list targets) | `pare-make list` |

### Security (`pare-security`)

| CLI Command | MCP Tool |
|---|---|
| `trivy` | `pare-security trivy` |
| `semgrep` | `pare-security semgrep` |
| `gitleaks` | `pare-security gitleaks` |

### Process (`pare-process`)

| CLI Command | MCP Tool |
|---|---|
| Any command not covered above | `pare-process run` |

## Error Handling

- If a Pare MCP tool returns an error, check the `error` field in the JSON response for details.
- Do not fall back to raw CLI commands when an MCP tool fails. Instead, fix the arguments and retry.
- If a tool is unavailable (server not running), inform the user and suggest they check their MCP configuration.
- All Pare tools return structured JSON. Parse the response fields directly; never wrap MCP calls in Bash.
