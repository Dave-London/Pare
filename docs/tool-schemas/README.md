# Tool Schemas

Structured JSON responses returned by Pare MCP tools compared to raw CLI output. Each tool page shows real terminal output examples alongside Pare's structured and compact responses with approximate token counts.

## Servers & Tools

| Server                | npm                   | Tools                                                                                                                                                                                                                                                      |
| --------------------- | --------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [bazel](bazel/)       | `@paretools/bazel`    | bazel                                                                                                                                                                                                                                                      |
| [build](build/)       | `@paretools/build`    | tsc, build, esbuild, vite-build, webpack, turbo, nx                                                                                                                                                                                                        |
| [cargo](cargo/)       | `@paretools/cargo`    | build, test, clippy, run, add, remove, fmt, doc, check, update, tree, audit                                                                                                                                                                                |
| [cmake](cmake/)       | `@paretools/cmake`    | cmake                                                                                                                                                                                                                                                      |
| [docker](docker/)     | `@paretools/docker`   | ps, build, logs, images, run, exec, compose-up, compose-down, pull, inspect, network-ls, volume-ls, compose-ps, compose-logs, compose-build, stats                                                                                                         |
| [git](git/)           | `@paretools/git`      | status, log, log-graph, diff, branch, show, add, commit, push, pull, checkout, tag, stash-list, stash, remote, blame, restore, reset, cherry-pick, merge, rebase, reflog, bisect, worktree                                                                 |
| [github](github/)     | `@paretools/github`   | pr-view, pr-list, pr-create, pr-merge, pr-comment, pr-review, pr-update, pr-checks, pr-diff, issue-view, issue-list, issue-create, issue-close, issue-comment, issue-update, run-view, run-list, run-rerun, api, release-create, release-list, gist-create |
| [go](go/)             | `@paretools/go`       | build, test, vet, run, mod-tidy, fmt, generate, env, list, get, golangci-lint                                                                                                                                                                              |
| [http](http/)         | `@paretools/http`     | request, get, post, head                                                                                                                                                                                                                                   |
| [k8s](k8s/)           | `@paretools/k8s`      | kubectl-get, kubectl-describe, kubectl-logs, kubectl-apply, helm                                                                                                                                                                                           |
| [lint](lint/)         | `@paretools/lint`     | lint, format-check, prettier-format, biome-check, biome-format, stylelint, oxlint, shellcheck, hadolint                                                                                                                                                    |
| [make](make/)         | `@paretools/make`     | run, list                                                                                                                                                                                                                                                  |
| [nix](nix/)           | `@paretools/nix`      | build, run, develop, shell, flake-show, flake-check, flake-update                                                                                                                                                                                          |
| [npm](npm/)           | `@paretools/npm`      | install, audit, outdated, list, run, test, init, info, search, nvm                                                                                                                                                                                         |
| [process](process/)   | `@paretools/process`  | run                                                                                                                                                                                                                                                        |
| [python](python/)     | `@paretools/python`   | pip-install, mypy, ruff-check, pip-audit, pytest, uv-install, uv-run, black, pip-list, pip-show, ruff-format, conda, pyenv, poetry                                                                                                                         |
| [search](search/)     | `@paretools/search`   | search, find, count, jq                                                                                                                                                                                                                                    |
| [security](security/) | `@paretools/security` | trivy, semgrep, gitleaks                                                                                                                                                                                                                                   |
| [test](test/)         | `@paretools/test`     | [run](test/run.md), [coverage](test/coverage.md), [playwright](test/playwright.md)                                                                                                                                                                         |

## Page Format

Each tool page contains a comparison table:

|             | Standard CLI Output | Pare Response                 |
| ----------- | ------------------- | ----------------------------- |
| **Success** | Raw terminal output | Structured JSON               |
| **Compact** | _(n/a)_             | Compact JSON (reduced tokens) |
| **Error**   | Raw error output    | Structured error JSON         |

All examples include approximate token counts (~4 chars/token).
