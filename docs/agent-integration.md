# Agent Integration Guide

This guide covers how to configure coding agents to use Pare MCP tools instead of raw CLI commands.

## Why Structured Output Matters

When a coding agent runs `git log --oneline -20`, the raw CLI output must be parsed from unstructured text. This has three problems:

1. **Token waste** — Raw CLI output is verbose. A `git status` call returns decorative headers, alignment spacing, and ANSI codes that consume tokens without adding value. Pare's structured JSON is typically 40-70% smaller.

2. **Fragile parsing** — Agents guess at text formats that change between tool versions, locales, and configurations. Structured JSON with named fields eliminates this class of errors.

3. **Inconsistent schemas** — `docker ps` output differs from `docker ps --format json`. Pare normalizes all output into a consistent schema per tool, so the agent always knows what to expect.

Pare solves all three by wrapping CLI tools in MCP servers that return structured JSON with optimized schemas.

## Quick Setup Per Agent

### Claude Code

1. Copy the rule file into your project:
```bash
cp rules/CLAUDE.md CLAUDE.md
```

2. (Optional) Install the PreToolUse hook for automatic enforcement:
```bash
mkdir -p .claude/hooks
cp hooks/pare-prefer-mcp.sh .claude/hooks/
chmod +x .claude/hooks/pare-prefer-mcp.sh
```

3. Add to `.claude/settings.json`:
```json
{
  "hooks": {
    "PreToolUse": [{
      "matcher": "Bash",
      "hooks": [{
        "type": "command",
        "command": "./.claude/hooks/pare-prefer-mcp.sh"
      }]
    }]
  }
}
```

See [Claude Code Hooks Deep Dive](#claude-code-hooks-deep-dive) for details.

### Cursor

Copy the rule file:
```bash
mkdir -p .cursor/rules
cp rules/.cursor/rules/pare.mdc .cursor/rules/pare.mdc
```

The `alwaysApply: true` frontmatter ensures the rules are active for every conversation.

### Windsurf

Copy the rule file to your project root:
```bash
cp rules/.windsurfrules .windsurfrules
```

The file must stay under 6,000 characters (it currently uses ~1,800).

### Cline

Copy the rule file:
```bash
mkdir -p .clinerules
cp rules/.clinerules/pare.md .clinerules/pare.md
```

### GitHub Copilot

Copy the rule file:
```bash
mkdir -p .github
cp rules/.github/copilot-instructions.md .github/copilot-instructions.md
```

### Gemini CLI

Copy the rule file to your project root:
```bash
cp rules/GEMINI.md GEMINI.md
```

### Aider

Copy the conventions file:
```bash
cp rules/CONVENTIONS.md CONVENTIONS.md
```

Note: Aider does not support MCP natively. See the file for workaround options.

## Claude Code Hooks Deep Dive

The `hooks/pare-prefer-mcp.sh` script is a PreToolUse hook that intercepts Bash tool calls before they execute. When the agent tries to run a CLI command that has a Pare MCP equivalent, the hook blocks the call and returns a deny response with the correct MCP tool name.

### How It Works

1. Claude Code sends the tool input as JSON on stdin:
   ```json
   {
     "tool_name": "Bash",
     "tool_input": {
       "command": "git status"
     }
   }
   ```

2. The hook extracts the command, identifies the binary (`git`), and checks if it maps to a Pare server.

3. If matched, it returns a deny response:
   ```json
   {
     "hookSpecificOutput": {
       "hookEventName": "PreToolUse",
       "permissionDecision": "deny",
       "permissionDecisionReason": "Use pare-git status instead of 'git status'. The MCP tool returns structured JSON with fewer tokens."
     }
   }
   ```

4. Claude Code sees the denial and uses the suggested MCP tool instead.

### Compound Commands

The hook only checks the first command in pipes and chains:
- `echo foo | grep bar` — allowed (first command is `echo`)
- `grep pattern file | wc -l` — denied (first command is `grep`)
- `cd /tmp && git status` — allowed (first command is `cd`)

### Configuration

Toggle individual servers on/off in the config section at the top of the script:

```bash
PARE_GIT=1        # Comment out to allow raw git commands
PARE_GITHUB=1
PARE_NPM=1
PARE_SEARCH=1
PARE_LINT=1
PARE_BUILD=1
PARE_TEST=1
PARE_DOCKER=1
PARE_HTTP=1
PARE_MAKE=1
PARE_CARGO=1
PARE_GO=1
PARE_PYTHON=1
PARE_K8S=1
PARE_SECURITY=1
```

## CLI to MCP Mapping Reference

### pare-git (replaces `git`)

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

### pare-github (replaces `gh`)

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

### pare-npm (replaces `npm`, `pnpm`, `yarn`)

| CLI Command | MCP Tool |
|---|---|
| `npm install` | `pare-npm install` |
| `npm audit` | `pare-npm audit` |
| `npm outdated` | `pare-npm outdated` |
| `npm list` | `pare-npm list` |
| `npm run <script>` | `pare-npm run` |
| `npm test` | `pare-npm test` |
| `npm init` | `pare-npm init` |
| `npm info <pkg>` | `pare-npm info` |
| `npm search <query>` | `pare-npm search` |
| `nvm` | `pare-npm nvm` |

### pare-search (replaces search tools)

| CLI Command | MCP Tool |
|---|---|
| `grep` / `rg` | `pare-search search` |
| `find` / `fd` | `pare-search find` |
| `wc` | `pare-search count` |
| `jq` | `pare-search jq` |
| `yq` | `pare-search yq` |

### pare-lint (replaces linters/formatters)

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

### pare-build (replaces build tools)

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

### pare-test (replaces test runners)

| CLI Command | MCP Tool |
|---|---|
| `vitest` / `jest` / `mocha` / `pytest` | `pare-test run` |
| `vitest --coverage` | `pare-test coverage` |
| `playwright test` | `pare-test playwright` |

### pare-docker (replaces `docker`)

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

### pare-cargo (replaces `cargo`)

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

### pare-go (replaces `go`, `golangci-lint`)

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

### pare-python (replaces Python tools)

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

### pare-k8s (replaces `kubectl`, `helm`)

| CLI Command | MCP Tool |
|---|---|
| `kubectl get` | `pare-k8s get` |
| `kubectl describe` | `pare-k8s describe` |
| `kubectl logs` | `pare-k8s logs` |
| `kubectl apply` | `pare-k8s apply` |
| `helm` | `pare-k8s helm` |

### pare-http (replaces `curl`, `wget`)

| CLI Command | MCP Tool |
|---|---|
| `curl` / `wget` | `pare-http request` |
| `curl -X GET <url>` | `pare-http get` |
| `curl -X POST <url>` | `pare-http post` |
| `curl -I <url>` | `pare-http head` |

### pare-make (replaces `make`, `just`)

| CLI Command | MCP Tool |
|---|---|
| `make <target>` / `just <target>` | `pare-make run` |
| List targets | `pare-make list` |

### pare-security (replaces security scanners)

| CLI Command | MCP Tool |
|---|---|
| `trivy` | `pare-security trivy` |
| `semgrep` | `pare-security semgrep` |
| `gitleaks` | `pare-security gitleaks` |

### pare-process (general fallback)

| CLI Command | MCP Tool |
|---|---|
| Any command not covered above | `pare-process run` |

## Fallback Patterns

When a Pare MCP tool call fails, follow these steps:

### 1. Check the Error Response

All Pare tools return errors in a consistent JSON format:
```json
{
  "error": "Description of what went wrong",
  "code": "ERROR_CODE"
}
```

Read the `error` field to understand the problem.

### 2. Fix and Retry

Common fixes:
- **Missing required parameter** — Add the missing field to the tool input.
- **Invalid path** — Verify the path exists and is absolute.
- **Permission denied** — Check file/directory permissions.
- **Tool not found** — The underlying CLI tool is not installed. Install it and retry.

### 3. Use `pare-process run` as Last Resort

If a specific Pare tool is unavailable or broken, `pare-process run` can execute any command and still return structured output:
```
pare-process run { "command": "git status" }
```

This is better than raw Bash because the output is still wrapped in a structured response.

### 4. Never Fall Back to Raw CLI

Do not bypass Pare by running the raw CLI command in a shell. This defeats the purpose of structured output and wastes tokens. If a Pare server is down, inform the user and suggest they check their MCP configuration.

## FAQ

### Which agents support MCP?

Claude Code, Cursor, Windsurf, Cline, and GitHub Copilot all support MCP tool servers. Aider and some other agents do not have native MCP support.

### Do I need all 16 Pare servers?

No. Install only the servers you need. The rule files cover all servers, but agents will simply skip tools that are not available.

### Can I use Pare with multiple agents?

Yes. Copy the appropriate rule file for each agent you use. They can all connect to the same Pare MCP servers.

### How do I install Pare servers?

See the main [README](../README.md) for installation instructions. Each server is an npm package under `@anthropic/pare-*`.

### What if a Pare tool is slower than the raw CLI?

Pare adds minimal overhead (typically < 50ms) for JSON serialization. The token savings from structured output far outweigh this latency. If you observe significant slowness, file an issue.

### Can I customize which commands are intercepted?

Yes. The Claude Code hook (`hooks/pare-prefer-mcp.sh`) has a config section where you can disable individual servers. For other agents, edit the rule file to remove tools you do not want enforced.

### What about commands Pare does not cover?

Use `pare-process run` to execute any command with structured output wrapping. You can also use raw Bash for commands that Pare genuinely does not cover (e.g., `ls`, `cat`, `echo`).

### Does the hook affect non-Pare commands?

No. The hook only intercepts commands whose binary name matches a Pare-supported tool. Commands like `ls`, `cat`, `echo`, `cd`, `mkdir`, etc. pass through without any interception.
