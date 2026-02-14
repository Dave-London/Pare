# Pare CLI Tools Roadmap

**Last updated**: 2026-02-14 | **Current**: v0.8.2 — 147 tools across 16 packages

This roadmap tracks CLI tools and capabilities we plan to wrap with structured, token-efficient MCP output in future Pare releases. Priorities are based on real-world coding agent usage patterns, ecosystem gap analysis, and implementation complexity.

See the [README](README.md) for the full list of tools already implemented.

> **Want to contribute?** Pick a tool from any section below, open an issue to discuss the approach, and submit a PR. See [CONTRIBUTING.md](CONTRIBUTING.md) for how to get started.
>
> **Have thoughts on priorities?** We'd love your input. If there's a tool you rely on that's missing or misprioritzed, [open a discussion](https://github.com/Dave-London/Pare/discussions) or comment on an existing issue — real-world usage patterns are the best signal for what to build next.

---

## Coming Soon

Tools we're actively considering for upcoming releases based on agent usage patterns and community requests.

### Git

| Tool            | Package | Purpose                              | Agent Frequency | Complexity |
| --------------- | ------- | ------------------------------------ | --------------- | ---------- |
| `git submodule` | git     | Submodule init, update, status       | Very Low        | Medium     |
| `git archive`   | git     | Create archives from git tree        | Very Low        | Low        |
| `git clean`     | git     | Remove untracked files (destructive) | Very Low        | Low        |
| `git config`    | git     | Get/set git configuration            | Very Low        | Low        |

### GitHub

| Tool              | Package | Purpose                  | Agent Frequency | Complexity |
| ----------------- | ------- | ------------------------ | --------------- | ---------- |
| `repo-view`       | github  | View repository metadata | Low             | Low        |
| `repo-clone`      | github  | Clone a repository       | Very Low        | Low        |
| `discussion-list` | github  | List GitHub discussions  | Very Low        | Medium     |

### Infrastructure as Code

| Tool        | Package      | Purpose                                             | Agent Frequency | Complexity |
| ----------- | ------------ | --------------------------------------------------- | --------------- | ---------- |
| `terraform` | _new: infra_ | Terraform plan, apply, state with structured output | Low             | High       |
| `ansible`   | _new: infra_ | Ansible playbook run with structured results        | Low             | High       |
| `vagrant`   | _new: infra_ | Vagrant up, halt, status                            | Very Low        | Medium     |

### Build

| Tool     | Package | Purpose                         | Agent Frequency | Complexity |
| -------- | ------- | ------------------------------- | --------------- | ---------- |
| `lerna`  | build   | Lerna versioning and publishing | Very Low        | Medium     |
| `rollup` | build   | Library bundling                | Low             | Medium     |

### Language Ecosystems

| Tool           | Package       | Purpose                                   | Agent Frequency | Complexity |
| -------------- | ------------- | ----------------------------------------- | --------------- | ---------- |
| `gradle`       | _new: jvm_    | Gradle build, test with structured output | Low             | High       |
| `maven`        | _new: jvm_    | Maven build, test with structured output  | Low             | High       |
| `swift`        | _new: swift_  | Swift build, test, package management     | Low             | High       |
| `dotnet`       | _new: dotnet_ | .NET build, test, publish                 | Low             | High       |
| `ruby/bundler` | _new: ruby_   | Bundler install, rake test                | Low             | High       |
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

### Large-Surface CLIs

These tools have very large command surfaces (hundreds of subcommands) or are interactive/session-based. They present unique wrapping challenges, but every CLI tool benefits from Pare's structured output layer — and platform-specific vendor MCP servers don't provide the same agent-oriented optimizations (token efficiency, consistent error shapes, input validation) that Pare does.

| Tool                                                                                 | Notes                                                                                         |
| ------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------- |
| Full cloud CLIs (`aws`, `gcloud`, `az`)                                              | 200+ subcommands each; likely scoped to the most agent-relevant subset per platform           |
| `jupyter`                                                                            | Kernel-based; would need a different interaction model than CLI wrapping                      |
| Interactive debuggers (`delve`, `gdb`, `lldb`)                                       | Session state and interactive stepping; may benefit from a run-to-breakpoint wrapper          |
| Full CI/CD platforms (`jenkins`, `circleci`)                                         | Large surface; scoped subsets (trigger build, get status) are feasible                        |
| Platform-as-a-Service CLIs (`vercel`, `netlify`, `firebase`, `supabase`, `wrangler`) | Vendor-specific; scoped subsets (deploy status, logs, env vars) would provide agent value     |
| `fzf`, `htop` / `top`                                                                | Interactive TUI tools; limited structured output use case, but metrics extraction is possible |

---

## Coverage by Developer Profile

Estimated percentage of daily CLI tool usage that Pare can handle (v0.8.2, 147 tools):

| Developer Profile          | Current |
| -------------------------- | ------- |
| Frontend / Web             | 88-93%  |
| Rust                       | 85-90%  |
| Backend Node.js            | 85-90%  |
| Go                         | 83-88%  |
| Full-Stack (Node + Python) | 80-87%  |
| Python Backend             | 78-83%  |
| AI/ML Engineer             | 48-55%  |
| DevOps / Platform Eng.     | 45-52%  |
| Mobile (iOS/Android)       | 32-38%  |

Every tool on this roadmap moves these numbers up. If your profile is underserved, [tell us what tools you need](https://github.com/Dave-London/Pare/discussions).

---

## Prioritization Criteria

- **Agent Frequency**: How often coding agents (Claude Code, Copilot, Cursor, etc.) invoke this tool in typical workflows. Based on shell history analysis, agent trace data, and direct observation during development.
- **Complexity**: Implementation effort considering parsing difficulty, output variability, platform differences, and testing requirements.
  - **Low**: Simple command with predictable output, straightforward parsing
  - **Medium**: Multiple output formats or flags, moderate parsing logic
  - **High**: Complex/variable output, platform-specific behavior, state management, or streaming

## Sources

- [Shell history analysis (Jerry Ng 2024)](https://jerryng.com/blog/2024-shell-history-analysis/): git 59%, npm 6.5%, docker 6.1%
- [Anthropic "How People Prompt" (2025)](https://www.anthropic.com/research/how-people-prompt): File Read 35-45%, Terminal 15-25%, Git 10-15%
- [SWE-bench Agent Traces (2024-2025)](https://www.swebench.com/): heavy git/test usage patterns
- [Stack Overflow Developer Survey 2025](https://survey.stackoverflow.co/2025/)
- Direct observation: tools used via Bash fallback in Pare development sessions
- CLI Tool Landscape Report (2026-02-13): synthesis of public ecosystem data across 150+ tools and 28 categories
- MCP Dev Tools Landscape (2026-02-10): comparative analysis drawing on registry data, community discussions, and published benchmarks
