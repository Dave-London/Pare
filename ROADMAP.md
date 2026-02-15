# Pare CLI Tools Roadmap

**Last updated**: 2026-02-13 | **Current**: v0.8.0 — 147 tools across 16 packages

This roadmap tracks CLI tools and capabilities we plan to wrap with structured, token-efficient MCP output in future Pare releases. Priorities are based on real-world coding agent usage patterns, ecosystem gap analysis, and implementation complexity.

See the [README](README.md) for the full list of tools already implemented.

> **Want to contribute?** Pick a tool from any section below, open an issue to discuss the approach, and submit a PR. See [CONTRIBUTING.md](CONTRIBUTING.md) for how to get started.
>
> **Have thoughts on priorities?** We'd love your input. If there's a tool you rely on that's missing or misprioritzed, [open a discussion](https://github.com/Dave-London/Pare/discussions) or comment on an existing issue — real-world usage patterns are the best signal for what to build next.

---

## Recently Shipped (v0.8.0)

These tools were implemented in v0.8.0 and moved from the short-term roadmap:

| Tool              | Package | Status  |
| ----------------- | ------- | ------- |
| `git reset`       | git     | Shipped |
| `git restore`     | git     | Shipped |
| `git merge`       | git     | Shipped |
| `git rebase`      | git     | Shipped |
| `git cherry-pick` | git     | Shipped |
| `pr-merge`        | github  | Shipped |
| `pr-comment`      | github  | Shipped |
| `pr-review`       | github  | Shipped |
| `pr-update`       | github  | Shipped |
| `issue-comment`   | github  | Shipped |
| `issue-close`     | github  | Shipped |
| `issue-update`    | github  | Shipped |

---

## Short Term / High Priority

Tools that coding agents reach for frequently but currently require raw CLI fallback. High impact on daily agent workflows.

| Tool            | Package | Purpose                                                                       | Agent Frequency | Complexity |
| --------------- | ------- | ----------------------------------------------------------------------------- | --------------- | ---------- |
| `pnpm` support  | npm     | pnpm install, run, test (pnpm workspace awareness)                            | High            | Medium     |
| `jq`            | search  | JSON processing and transformation                                            | High            | Medium     |
| `golangci-lint` | go      | Go meta-linter with structured JSON output                                    | Medium-High     | Medium     |
| `cargo audit`   | cargo   | Rust dependency vulnerability scanning (consistent with npm audit, pip audit) | Medium          | Low        |
| `gh run rerun`  | github  | Re-run failed CI workflow runs                                                | Medium          | Low        |
| `gh api`        | github  | Generic GitHub API calls for uncovered endpoints                              | Medium          | Medium     |
| `pr-checks`     | github  | List check/status results for a PR                                            | Medium          | Medium     |
| `pr-diff`       | github  | Get the diff of a pull request                                                | Medium          | Medium     |

---

## Medium Term / Medium Priority

Useful but less frequent in typical coding agent workflows, or requiring more complex parsing and output structuring.

### Git — Advanced Operations

| Tool              | Package | Purpose                                   | Agent Frequency | Complexity |
| ----------------- | ------- | ----------------------------------------- | --------------- | ---------- |
| `git log --graph` | git     | Visual branch topology as structured data | Low-Medium      | High       |
| `git reflog`      | git     | Reference log for recovery operations     | Low             | Medium     |
| `git bisect`      | git     | Binary search for bug-introducing commits | Low             | High       |
| `git worktree`    | git     | Manage multiple working trees             | Low-Medium      | Medium     |

### GitHub — Releases & Extras

| Tool             | Package | Purpose                            | Agent Frequency | Complexity |
| ---------------- | ------- | ---------------------------------- | --------------- | ---------- |
| `release-create` | github  | Create a GitHub release with notes | Low-Medium      | Medium     |
| `release-list`   | github  | List releases                      | Low             | Low        |
| `gist-create`    | github  | Create a gist                      | Low             | Low        |

### Package Managers

| Tool           | Package | Purpose                                   | Agent Frequency | Complexity |
| -------------- | ------- | ----------------------------------------- | --------------- | ---------- |
| `yarn` support | npm     | Yarn install, run, test (berry + classic) | Medium          | Medium     |
| `nvm`          | npm     | Node.js version management                | Low             | Low        |

### Python Ecosystem

| Tool     | Package | Purpose                                  | Agent Frequency | Complexity |
| -------- | ------- | ---------------------------------------- | --------------- | ---------- |
| `conda`  | python  | Conda environment and package management | Low-Medium      | Medium     |
| `pyenv`  | python  | Python version management                | Low             | Medium     |
| `poetry` | python  | Poetry install, build, publish           | Low-Medium      | Medium     |

### Build & Monorepo

| Tool    | Package | Purpose                                         | Agent Frequency | Complexity |
| ------- | ------- | ----------------------------------------------- | --------------- | ---------- |
| `turbo` | build   | Turborepo task orchestration, affected packages | Low-Medium      | High       |
| `nx`    | build   | Nx workspace commands, dependency graph         | Low-Medium      | High       |

### Docker & Containers

| Tool            | Package | Purpose                                         | Agent Frequency | Complexity |
| --------------- | ------- | ----------------------------------------------- | --------------- | ---------- |
| `compose-logs`  | docker  | Docker compose logs with structured output      | Medium          | Medium     |
| `compose-build` | docker  | Docker compose build services                   | Low-Medium      | Medium     |
| `docker-stats`  | docker  | Container resource usage (CPU, memory, network) | Low-Medium      | Medium     |

### Kubernetes

| Tool      | Package    | Purpose                               | Agent Frequency | Complexity |
| --------- | ---------- | ------------------------------------- | --------------- | ---------- |
| `kubectl` | _new: k8s_ | Kubernetes get, describe, apply, logs | Low-Medium      | High       |
| `helm`    | _new: k8s_ | Helm install, upgrade, list, status   | Low             | High       |

### Security Scanning

| Tool         | Package         | Purpose                                        | Agent Frequency | Complexity |
| ------------ | --------------- | ---------------------------------------------- | --------------- | ---------- |
| `trivy`      | _new: security_ | Container and IaC vulnerability scanning       | Low-Medium      | Medium     |
| `semgrep`    | _new: security_ | Static analysis with structured rules/findings | Low-Medium      | Medium     |
| `gitleaks`   | _new: security_ | Secret detection in repositories               | Low             | Low        |
| `shellcheck` | lint            | Shell script linting (JSON output mode)        | Low             | Low        |
| `hadolint`   | lint            | Dockerfile linting (JSON output mode)          | Low             | Low        |

### Testing — E2E

| Tool         | Package | Purpose                                | Agent Frequency | Complexity |
| ------------ | ------- | -------------------------------------- | --------------- | ---------- |
| `playwright` | test    | E2E browser testing with JSON reporter | Low-Medium      | High       |

### Process Management

| Tool          | Package        | Purpose                                                | Agent Frequency | Complexity |
| ------------- | -------------- | ------------------------------------------------------ | --------------- | ---------- |
| `process-run` | _new: process_ | Run long commands with streaming output, timeout, kill | Medium          | High       |

---

## Backlog / Low Priority

Niche tools, rarely used by coding agents, or with limited token-saving potential. May be promoted if demand surfaces.

### Git — Niche

| Tool            | Package | Purpose                              | Agent Frequency | Complexity |
| --------------- | ------- | ------------------------------------ | --------------- | ---------- |
| `git submodule` | git     | Submodule init, update, status       | Very Low        | Medium     |
| `git archive`   | git     | Create archives from git tree        | Very Low        | Low        |
| `git clean`     | git     | Remove untracked files (destructive) | Very Low        | Low        |
| `git config`    | git     | Get/set git configuration            | Very Low        | Low        |

### GitHub — Niche

| Tool              | Package | Purpose                  | Agent Frequency | Complexity |
| ----------------- | ------- | ------------------------ | --------------- | ---------- |
| `repo-view`       | github  | View repository metadata | Low             | Low        |
| `repo-clone`      | github  | Clone a repository       | Very Low        | Low        |
| `discussion-list` | github  | List GitHub discussions  | Very Low        | Medium     |

### Infrastructure as Code

| Tool        | Package      | Purpose                                             | Agent Frequency | Complexity |
| ----------- | ------------ | --------------------------------------------------- | --------------- | ---------- |
| `terraform` | _new: infra_ | Terraform plan, apply, state with structured output | Very Low        | High       |
| `ansible`   | _new: infra_ | Ansible playbook run with structured results        | Very Low        | High       |
| `vagrant`   | _new: infra_ | Vagrant up, halt, status                            | Very Low        | Medium     |

### Build — Niche

| Tool     | Package | Purpose                         | Agent Frequency | Complexity |
| -------- | ------- | ------------------------------- | --------------- | ---------- |
| `lerna`  | build   | Lerna versioning and publishing | Very Low        | Medium     |
| `rollup` | build   | Library bundling                | Low             | Medium     |

### Additional Language Ecosystems

| Tool           | Package       | Purpose                                   | Agent Frequency | Complexity |
| -------------- | ------------- | ----------------------------------------- | --------------- | ---------- |
| `gradle`       | _new: jvm_    | Gradle build, test with structured output | Low             | High       |
| `maven`        | _new: jvm_    | Maven build, test with structured output  | Low             | High       |
| `swift`        | _new: swift_  | Swift build, test, package management     | Very Low        | High       |
| `dotnet`       | _new: dotnet_ | .NET build, test, publish                 | Very Low        | High       |
| `ruby/bundler` | _new: ruby_   | Bundler install, rake test                | Very Low        | High       |
| `deno`         | _new: deno_   | Deno run, test, lint, fmt                 | Low             | Medium     |
| `bun`          | _new: bun_    | Bun install, run, test                    | Low             | Medium     |
| `cmake`        | _new: cmake_  | CMake configure, build                    | Very Low        | High       |
| `bazel`        | _new: bazel_  | Bazel build, test                         | Very Low        | High       |
| `nix`          | _new: nix_    | Nix build, develop, shell                 | Very Low        | High       |

### Database

| Tool        | Package   | Purpose                                                          | Agent Frequency | Complexity |
| ----------- | --------- | ---------------------------------------------------------------- | --------------- | ---------- |
| `database`  | _new: db_ | SQL query execution, schema inspection (postgres, sqlite, mysql) | Low             | High       |
| `redis-cli` | _new: db_ | Redis commands with structured responses                         | Very Low        | Medium     |
| `mongosh`   | _new: db_ | MongoDB shell with structured output                             | Very Low        | Medium     |

### Networking & Remote

| Tool    | Package       | Purpose                               | Agent Frequency | Complexity |
| ------- | ------------- | ------------------------------------- | --------------- | ---------- |
| `ssh`   | _new: remote_ | SSH command execution on remote hosts | Very Low        | High       |
| `rsync` | _new: remote_ | File synchronization                  | Very Low        | Medium     |

### Text Processing

| Tool | Package | Purpose                            | Agent Frequency | Complexity |
| ---- | ------- | ---------------------------------- | --------------- | ---------- |
| `yq` | search  | YAML processing and transformation | Low             | Medium     |

---

## Not Planned

Tools that are better served by dedicated MCP servers, are interactive/TUI-based, or have surface areas too large for Pare's structured-output approach.

| Tool                                                                                 | Reason                                                                                                  |
| ------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------- |
| Full cloud CLIs (`aws`, `gcloud`, `az`)                                              | 200+ subcommands each; better served by platform-specific MCP servers (e.g., AWS MCP, Google Cloud MCP) |
| `jupyter`                                                                            | Interactive kernel model; doesn't fit CLI wrapper pattern                                               |
| `fzf`                                                                                | Interactive fuzzy finder; no structured output use case                                                 |
| `htop` / `top`                                                                       | Interactive TUI; no structured output use case                                                          |
| Interactive debuggers (`delve`, `gdb`, `lldb`)                                       | Require session state and interactive stepping                                                          |
| Full CI/CD platforms (`jenkins`, `circleci`)                                         | Platform-specific; dedicated MCP servers already exist                                                  |
| Platform-as-a-Service CLIs (`vercel`, `netlify`, `firebase`, `supabase`, `wrangler`) | Platform-specific; each vendor is building their own MCP servers                                        |

---

## Coverage by Developer Profile

Estimated percentage of daily CLI tool usage that Pare can handle (v0.8.0, 147 tools):

| Developer Profile          | Current | With Full Roadmap |
| -------------------------- | ------- | ----------------- |
| Frontend / Web             | 85-90%  | ~95%              |
| Rust                       | 85-90%  | ~93%              |
| Backend Node.js            | 80-85%  | ~92%              |
| Go                         | 80-85%  | ~90%              |
| Full-Stack (Node + Python) | 75-80%  | ~88%              |
| Python Backend             | 70-75%  | ~85%              |
| AI/ML Engineer             | 40-50%  | ~55%              |
| DevOps / Platform Eng.     | 30-40%  | ~55%              |
| Mobile (iOS/Android)       | 30-35%  | ~40%              |
| JVM (Java/Kotlin)          | 15-20%  | ~40%              |
| .NET                       | 10-15%  | ~30%              |

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
- CLI Tool Landscape Report (2026-02-13): 150+ tools surveyed across 28 categories
- MCP Dev Tools Landscape gap analysis (2026-02-10)
- Direct observation: tools used via Bash fallback in Pare development sessions
- SWE-bench Agent Traces (2024-2025): heavy git/test usage patterns
- Stack Overflow Developer Survey 2025
