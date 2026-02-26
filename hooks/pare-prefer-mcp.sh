#!/usr/bin/env bash
# =============================================================================
# pare-prefer-mcp.sh — PreToolUse hook for Claude Code
# =============================================================================
#
# WHAT IT DOES:
#   Intercepts Bash tool calls that have Pare MCP equivalents and denies them
#   with a helpful message pointing to the correct MCP tool. This ensures your
#   agent always uses structured JSON output instead of parsing raw CLI text.
#
# HOW TO INSTALL:
#   1. Copy this file into your project (e.g., .claude/hooks/pare-prefer-mcp.sh)
#   2. Make it executable:  chmod +x .claude/hooks/pare-prefer-mcp.sh
#   3. Add to your .claude/settings.json (see hooks/settings.json for example):
#
#      {
#        "hooks": {
#          "PreToolUse": [{
#            "matcher": "Bash",
#            "hooks": [{
#              "type": "command",
#              "command": "./.claude/hooks/pare-prefer-mcp.sh"
#            }]
#          }]
#        }
#      }
#
# CUSTOMIZATION:
#   To disable interception for specific servers, comment out or remove the
#   corresponding case block in the ENABLED SERVERS section below. For example,
#   to allow raw docker commands, comment out the "docker)" block.
#
# =============================================================================

set -euo pipefail

# =============================================================================
# ENABLED SERVERS — comment out any line to stop intercepting that CLI tool
# =============================================================================
PARE_GIT=1
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
# =============================================================================

INPUT=$(cat)
COMMAND=$(echo "$INPUT" | jq -r '.tool_input.command // empty')

if [[ -z "$COMMAND" ]]; then
  exit 0
fi

# Extract the first token (the binary being called)
FIRST_TOKEN=$(echo "$COMMAND" | awk '{print $1}')

# Strip any leading path (e.g., /usr/bin/git -> git)
BINARY=$(basename "$FIRST_TOKEN")

# For compound commands (pipes, &&, ;), only check the first command
# This avoids false positives on "echo foo | grep bar"
case "$COMMAND" in
  *'|'*|*'&&'*|*';'*)
    # Only match if the very first command in the chain is the CLI tool
    FIRST_CMD=$(echo "$COMMAND" | sed 's/[|;&].*//' | awk '{print $1}')
    BINARY=$(basename "$FIRST_CMD")
    ;;
esac

deny() {
  local reason="$1"
  cat <<EOJSON
{
  "hookSpecificOutput": {
    "hookEventName": "PreToolUse",
    "permissionDecision": "deny",
    "permissionDecisionReason": "$reason"
  }
}
EOJSON
  exit 0
}

case "$BINARY" in
  # --- git -> pare-git ---
  git)
    [[ -z "${PARE_GIT:-}" ]] && exit 0
    # Extract the git subcommand
    GIT_SUB=$(echo "$COMMAND" | awk '{for(i=1;i<=NF;i++){if($i!~/^-/&&$i!="git"){print $i;exit}}}')
    case "$GIT_SUB" in
      status|log|diff|branch|show|add|commit|push|pull|checkout|tag|stash|remote|blame|restore|reset|cherry-pick|merge|rebase|reflog|bisect|worktree|submodule|archive|clean|config)
        deny "Use pare-git $GIT_SUB instead of 'git $GIT_SUB'. The MCP tool returns structured JSON with fewer tokens."
        ;;
      *)
        exit 0
        ;;
    esac
    ;;

  # --- gh -> pare-github ---
  gh)
    [[ -z "${PARE_GITHUB:-}" ]] && exit 0
    deny "Use pare-github tools instead of 'gh'. Available: pr-view, pr-list, pr-create, pr-merge, pr-comment, pr-review, pr-update, pr-checks, pr-diff, issue-view, issue-list, issue-create, issue-close, issue-comment, issue-update, run-view, run-list, run-rerun, release-create, release-list, label-list, label-create, repo-view, repo-clone, discussion-list, gist-create, api."
    ;;

  # --- npm/pnpm/yarn query commands -> pare-npm ---
  npm)
    [[ -z "${PARE_NPM:-}" ]] && exit 0
    NPM_SUB=$(echo "$COMMAND" | awk '{print $2}')
    case "$NPM_SUB" in
      audit|outdated|list|ls|info|view|show|search|init)
        deny "Use pare-npm $NPM_SUB instead of 'npm $NPM_SUB'. The MCP tool returns structured JSON."
        ;;
      test|run)
        deny "Use pare-npm $NPM_SUB (or pare-test for test execution) instead of 'npm $NPM_SUB'."
        ;;
      install|i|add)
        deny "Use pare-npm install instead of 'npm install'."
        ;;
      *)
        exit 0
        ;;
    esac
    ;;

  pnpm)
    [[ -z "${PARE_NPM:-}" ]] && exit 0
    PNPM_SUB=$(echo "$COMMAND" | awk '{print $2}')
    case "$PNPM_SUB" in
      audit|outdated|list|ls|info|view|show|search)
        deny "Use pare-npm $PNPM_SUB instead of 'pnpm $PNPM_SUB'. The MCP tool returns structured JSON."
        ;;
      test)
        deny "Use pare-test run or pare-npm test instead of 'pnpm test'."
        ;;
      install|i|add)
        deny "Use pare-npm install instead of 'pnpm install'."
        ;;
      *)
        exit 0
        ;;
    esac
    ;;

  yarn)
    [[ -z "${PARE_NPM:-}" ]] && exit 0
    YARN_SUB=$(echo "$COMMAND" | awk '{print $2}')
    case "$YARN_SUB" in
      audit|outdated|list|info)
        deny "Use pare-npm $YARN_SUB instead of 'yarn $YARN_SUB'. The MCP tool returns structured JSON."
        ;;
      test)
        deny "Use pare-test run or pare-npm test instead of 'yarn test'."
        ;;
      install|add)
        deny "Use pare-npm install instead of 'yarn install'."
        ;;
      *)
        exit 0
        ;;
    esac
    ;;

  # --- grep/rg -> pare-search ---
  grep|rg|ripgrep)
    [[ -z "${PARE_SEARCH:-}" ]] && exit 0
    deny "Use pare-search search instead of '$BINARY'. The MCP tool returns structured match data with file, line, and column info."
    ;;

  # --- find/fd -> pare-search ---
  find|fd|fdfind)
    [[ -z "${PARE_SEARCH:-}" ]] && exit 0
    deny "Use pare-search find instead of '$BINARY'. The MCP tool returns structured file lists."
    ;;

  # --- jq -> pare-search ---
  jq)
    [[ -z "${PARE_SEARCH:-}" ]] && exit 0
    deny "Use pare-search jq instead of 'jq'. The MCP tool returns structured results."
    ;;

  # --- yq -> pare-search ---
  yq)
    [[ -z "${PARE_SEARCH:-}" ]] && exit 0
    deny "Use pare-search yq instead of 'yq'. The MCP tool returns structured results."
    ;;

  # --- eslint -> pare-lint ---
  eslint)
    [[ -z "${PARE_LINT:-}" ]] && exit 0
    deny "Use pare-lint lint instead of 'eslint'. The MCP tool returns structured violation data."
    ;;

  # --- prettier -> pare-lint ---
  prettier)
    [[ -z "${PARE_LINT:-}" ]] && exit 0
    deny "Use pare-lint format-check or prettier-format instead of 'prettier'. The MCP tool returns structured results."
    ;;

  # --- biome -> pare-lint ---
  biome)
    [[ -z "${PARE_LINT:-}" ]] && exit 0
    deny "Use pare-lint biome-check or biome-format instead of 'biome'. The MCP tool returns structured results."
    ;;

  # --- stylelint -> pare-lint ---
  stylelint)
    [[ -z "${PARE_LINT:-}" ]] && exit 0
    deny "Use pare-lint stylelint instead of 'stylelint'. The MCP tool returns structured results."
    ;;

  # --- oxlint -> pare-lint ---
  oxlint)
    [[ -z "${PARE_LINT:-}" ]] && exit 0
    deny "Use pare-lint oxlint instead of 'oxlint'. The MCP tool returns structured results."
    ;;

  # --- shellcheck -> pare-lint ---
  shellcheck)
    [[ -z "${PARE_LINT:-}" ]] && exit 0
    deny "Use pare-lint shellcheck instead of 'shellcheck'. The MCP tool returns structured results."
    ;;

  # --- hadolint -> pare-lint ---
  hadolint)
    [[ -z "${PARE_LINT:-}" ]] && exit 0
    deny "Use pare-lint hadolint instead of 'hadolint'. The MCP tool returns structured results."
    ;;

  # --- tsc -> pare-build ---
  tsc)
    [[ -z "${PARE_BUILD:-}" ]] && exit 0
    deny "Use pare-build tsc instead of 'tsc'. The MCP tool returns structured diagnostic data."
    ;;

  # --- esbuild -> pare-build ---
  esbuild)
    [[ -z "${PARE_BUILD:-}" ]] && exit 0
    deny "Use pare-build esbuild instead of 'esbuild'. The MCP tool returns structured results."
    ;;

  # --- webpack -> pare-build ---
  webpack)
    [[ -z "${PARE_BUILD:-}" ]] && exit 0
    deny "Use pare-build webpack instead of 'webpack'. The MCP tool returns structured results."
    ;;

  # --- rollup -> pare-build ---
  rollup)
    [[ -z "${PARE_BUILD:-}" ]] && exit 0
    deny "Use pare-build rollup instead of 'rollup'. The MCP tool returns structured results."
    ;;

  # --- turbo -> pare-build ---
  turbo)
    [[ -z "${PARE_BUILD:-}" ]] && exit 0
    deny "Use pare-build turbo instead of 'turbo'. The MCP tool returns structured results."
    ;;

  # --- vitest/jest/mocha -> pare-test ---
  vitest|jest|mocha)
    [[ -z "${PARE_TEST:-}" ]] && exit 0
    deny "Use pare-test run instead of '$BINARY'. The MCP tool returns structured pass/fail results."
    ;;

  # --- playwright -> pare-test ---
  playwright)
    [[ -z "${PARE_TEST:-}" ]] && exit 0
    deny "Use pare-test playwright instead of 'playwright'. The MCP tool returns structured results."
    ;;

  # --- docker -> pare-docker ---
  docker)
    [[ -z "${PARE_DOCKER:-}" ]] && exit 0
    deny "Use pare-docker tools instead of 'docker'. Available: ps, build, logs, images, run, exec, compose-up, compose-down, pull, inspect, network-ls, volume-ls, compose-ps, compose-logs, compose-build, stats."
    ;;

  # --- curl/wget -> pare-http ---
  curl|wget)
    [[ -z "${PARE_HTTP:-}" ]] && exit 0
    deny "Use pare-http request/get/post/head instead of '$BINARY'. The MCP tool returns structured response data."
    ;;

  # --- make/just -> pare-make ---
  make|just)
    [[ -z "${PARE_MAKE:-}" ]] && exit 0
    deny "Use pare-make run/list instead of '$BINARY'. The MCP tool returns structured output."
    ;;

  # --- cargo -> pare-cargo ---
  cargo)
    [[ -z "${PARE_CARGO:-}" ]] && exit 0
    deny "Use pare-cargo tools instead of 'cargo'. Available: build, test, clippy, run, add, remove, fmt, doc, check, update, tree, audit."
    ;;

  # --- go -> pare-go ---
  go)
    [[ -z "${PARE_GO:-}" ]] && exit 0
    GO_SUB=$(echo "$COMMAND" | awk '{print $2}')
    case "$GO_SUB" in
      build|test|vet|run|fmt|generate|env|list|get)
        deny "Use pare-go $GO_SUB instead of 'go $GO_SUB'. The MCP tool returns structured results."
        ;;
      mod)
        deny "Use pare-go mod-tidy instead of 'go mod'. The MCP tool returns structured results."
        ;;
      *)
        exit 0
        ;;
    esac
    ;;

  # --- golangci-lint -> pare-go ---
  golangci-lint)
    [[ -z "${PARE_GO:-}" ]] && exit 0
    deny "Use pare-go golangci-lint instead of 'golangci-lint'. The MCP tool returns structured results."
    ;;

  # --- python tools -> pare-python ---
  pytest)
    [[ -z "${PARE_PYTHON:-}" ]] && exit 0
    deny "Use pare-python pytest instead of 'pytest'. The MCP tool returns structured test results."
    ;;
  mypy)
    [[ -z "${PARE_PYTHON:-}" ]] && exit 0
    deny "Use pare-python mypy instead of 'mypy'. The MCP tool returns structured type errors."
    ;;
  ruff)
    [[ -z "${PARE_PYTHON:-}" ]] && exit 0
    deny "Use pare-python ruff-check or ruff-format instead of 'ruff'."
    ;;
  black)
    [[ -z "${PARE_PYTHON:-}" ]] && exit 0
    deny "Use pare-python black instead of 'black'."
    ;;
  pip|pip3)
    [[ -z "${PARE_PYTHON:-}" ]] && exit 0
    deny "Use pare-python pip-install/pip-list/pip-show/pip-audit instead of 'pip'."
    ;;
  uv)
    [[ -z "${PARE_PYTHON:-}" ]] && exit 0
    deny "Use pare-python uv-install/uv-run instead of 'uv'."
    ;;
  conda)
    [[ -z "${PARE_PYTHON:-}" ]] && exit 0
    deny "Use pare-python conda instead of 'conda'."
    ;;
  pyenv)
    [[ -z "${PARE_PYTHON:-}" ]] && exit 0
    deny "Use pare-python pyenv instead of 'pyenv'."
    ;;
  poetry)
    [[ -z "${PARE_PYTHON:-}" ]] && exit 0
    deny "Use pare-python poetry instead of 'poetry'."
    ;;

  # --- kubectl/helm -> pare-k8s ---
  kubectl)
    [[ -z "${PARE_K8S:-}" ]] && exit 0
    deny "Use pare-k8s get/describe/logs/apply instead of 'kubectl'."
    ;;
  helm)
    [[ -z "${PARE_K8S:-}" ]] && exit 0
    deny "Use pare-k8s helm instead of 'helm'."
    ;;

  # --- security scanners -> pare-security ---
  trivy)
    [[ -z "${PARE_SECURITY:-}" ]] && exit 0
    deny "Use pare-security trivy instead of 'trivy'."
    ;;
  semgrep)
    [[ -z "${PARE_SECURITY:-}" ]] && exit 0
    deny "Use pare-security semgrep instead of 'semgrep'."
    ;;
  gitleaks)
    [[ -z "${PARE_SECURITY:-}" ]] && exit 0
    deny "Use pare-security gitleaks instead of 'gitleaks'."
    ;;

  # --- everything else: allow ---
  *)
    exit 0
    ;;
esac
