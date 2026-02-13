# Pare CLI Tools Roadmap

**Last updated**: 2026-02-13 | **Current**: v0.7.0 — 100 tools across 14 packages

This roadmap tracks CLI tools and capabilities we plan to wrap with structured, token-efficient MCP output in future Pare releases. Priorities are based on real-world coding agent usage patterns, ecosystem gap analysis, and implementation complexity.

See the [README](README.md) for the full list of tools already implemented.

> **Want to contribute?** Pick a tool from any section below, open an issue to discuss the approach, and submit a PR. See [CONTRIBUTING.md](CONTRIBUTING.md) for how to get started.
>
> **Have thoughts on priorities?** We'd love your input. If there's a tool you rely on that's missing or misprioritzed, [open a discussion](https://github.com/Dave-London/Pare/discussions) or comment on an existing issue — real-world usage patterns are the best signal for what to build next.

---

## Short Term / High Priority

Tools that coding agents reach for frequently but currently require raw CLI fallback. High impact on daily agent workflows.

| Tool              | Package | Purpose                                              | Agent Frequency | Complexity |
| ----------------- | ------- | ---------------------------------------------------- | --------------- | ---------- |
| `git reset`       | git     | Unstage files (`git reset HEAD -- <files>`)          | High            | Low        |
| `git restore`     | git     | Discard working tree changes                         | High            | Low        |
| `git merge`       | git     | Merge branches (fast-forward and 3-way)              | Medium-High     | Medium     |
| `git rebase`      | git     | Rebase current branch onto target                    | Medium          | Medium     |
| `git cherry-pick` | git     | Apply specific commits to current branch             | Medium          | Medium     |
| `pr-merge`        | github  | Merge a pull request (squash/merge/rebase)           | High            | Low        |
| `pr-comment`      | github  | Add a comment to a pull request                      | High            | Low        |
| `pr-review`       | github  | Submit a PR review (approve/request changes/comment) | Medium-High     | Medium     |
| `pr-update`       | github  | Update PR title, body, labels, assignees             | Medium          | Low        |
| `issue-comment`   | github  | Add a comment to an issue                            | High            | Low        |
| `issue-close`     | github  | Close an issue with optional comment                 | Medium-High     | Low        |
| `issue-update`    | github  | Update issue title, body, labels, assignees          | Medium          | Low        |
| `pnpm` support    | npm     | pnpm install, run, test (pnpm workspace awareness)   | High            | Medium     |

---

## Longer Term / Medium Priority

Useful but less frequent in typical coding agent workflows, or requiring more complex parsing and output structuring.

| Tool              | Package        | Purpose                                                | Agent Frequency | Complexity |
| ----------------- | -------------- | ------------------------------------------------------ | --------------- | ---------- |
| `git log --graph` | git            | Visual branch topology as structured data              | Low-Medium      | High       |
| `git reflog`      | git            | Reference log for recovery operations                  | Low             | Medium     |
| `git bisect`      | git            | Binary search for bug-introducing commits              | Low             | High       |
| `git worktree`    | git            | Manage multiple working trees                          | Low-Medium      | Medium     |
| `pr-checks`       | github         | List check/status results for a PR                     | Medium          | Medium     |
| `pr-diff`         | github         | Get the diff of a pull request                         | Medium          | Medium     |
| `release-create`  | github         | Create a GitHub release with notes                     | Low-Medium      | Medium     |
| `release-list`    | github         | List releases                                          | Low             | Low        |
| `gist-create`     | github         | Create a gist                                          | Low             | Low        |
| `yarn` support    | npm            | Yarn install, run, test (berry + classic)              | Medium          | Medium     |
| `turbo`           | build          | Turborepo task orchestration, affected packages        | Low-Medium      | High       |
| `nx`              | build          | Nx workspace commands, dependency graph                | Low-Medium      | High       |
| `conda`           | python         | Conda environment and package management               | Low-Medium      | Medium     |
| `pyenv`           | python         | Python version management                              | Low             | Medium     |
| `poetry`          | python         | Poetry install, build, publish                         | Low-Medium      | Medium     |
| `nvm`             | npm            | Node.js version management                             | Low             | Low        |
| `compose-logs`    | docker         | Docker compose logs with structured output             | Medium          | Medium     |
| `compose-build`   | docker         | Docker compose build services                          | Low-Medium      | Medium     |
| `docker-stats`    | docker         | Container resource usage (CPU, memory, network)        | Low-Medium      | Medium     |
| `kubectl`         | _new: k8s_     | Kubernetes get, describe, apply, logs                  | Low-Medium      | High       |
| `helm`            | _new: k8s_     | Helm install, upgrade, list, status                    | Low             | High       |
| `process-run`     | _new: process_ | Run long commands with streaming output, timeout, kill | Medium          | High       |

---

## Backlog / Low Priority

Niche tools, rarely used by coding agents, or with limited token-saving potential. May be promoted if demand surfaces.

| Tool              | Package       | Purpose                                             | Agent Frequency | Complexity |
| ----------------- | ------------- | --------------------------------------------------- | --------------- | ---------- |
| `git submodule`   | git           | Submodule init, update, status                      | Very Low        | Medium     |
| `git archive`     | git           | Create archives from git tree                       | Very Low        | Low        |
| `git clean`       | git           | Remove untracked files (destructive)                | Very Low        | Low        |
| `git config`      | git           | Get/set git configuration                           | Very Low        | Low        |
| `repo-view`       | github        | View repository metadata                            | Low             | Low        |
| `repo-clone`      | github        | Clone a repository                                  | Very Low        | Low        |
| `discussion-list` | github        | List GitHub discussions                             | Very Low        | Medium     |
| `terraform`       | _new: infra_  | Terraform plan, apply, state with structured output | Very Low        | High       |
| `ansible`         | _new: infra_  | Ansible playbook run with structured results        | Very Low        | High       |
| `vagrant`         | _new: infra_  | Vagrant up, halt, status                            | Very Low        | Medium     |
| `lerna`           | build         | Lerna versioning and publishing                     | Very Low        | Medium     |
| `gradle`          | _new: jvm_    | Gradle build, test with structured output           | Low             | High       |
| `maven`           | _new: jvm_    | Maven build, test with structured output            | Low             | High       |
| `swift`           | _new: swift_  | Swift build, test, package management               | Very Low        | High       |
| `dotnet`          | _new: dotnet_ | .NET build, test, publish                           | Very Low        | High       |
| `ruby/bundler`    | _new: ruby_   | Bundler install, rake test                          | Very Low        | High       |
| `deno`            | _new: deno_   | Deno run, test, lint, fmt                           | Low             | Medium     |
| `bun`             | _new: bun_    | Bun install, run, test                              | Low             | Medium     |
| `cmake`           | _new: cmake_  | CMake configure, build                              | Very Low        | High       |
| `bazel`           | _new: bazel_  | Bazel build, test                                   | Very Low        | High       |
| `nix`             | _new: nix_    | Nix build, develop, shell                           | Very Low        | High       |
| `ssh`             | _new: remote_ | SSH command execution on remote hosts               | Very Low        | High       |
| `rsync`           | _new: remote_ | File synchronization                                | Very Low        | Medium     |
| `database`        | _new: db_     | SQL query execution, schema inspection              | Low             | High       |
| `redis-cli`       | _new: db_     | Redis commands with structured responses            | Very Low        | Medium     |

---

## Prioritization Criteria

- **Agent Frequency**: How often coding agents (Claude Code, Copilot, Cursor, etc.) invoke this tool in typical workflows. Based on shell history analysis, agent trace data, and direct observation during development.
- **Complexity**: Implementation effort considering parsing difficulty, output variability, platform differences, and testing requirements.
  - **Low**: Simple command with predictable output, straightforward parsing
  - **Medium**: Multiple output formats or flags, moderate parsing logic
  - **High**: Complex/variable output, platform-specific behavior, state management, or streaming

## Sources

- Shell history analysis (Jerry Ng 2024): git 59%, npm 6.5%, docker 6.1%
- Anthropic "How People Prompt" (2025): File Read 35-45%, Terminal 15-25%, Git 10-15%
- MCP Dev Tools Landscape gap analysis (2026)
- Direct observation: tools used via Bash fallback in Pare development sessions
- SWE-bench Agent Traces (2024-2025): heavy git/test usage patterns
