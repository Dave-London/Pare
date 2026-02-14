# Security Audit — Pare v0.8.2

**Date:** 2026-02-14
**Scope:** All 16 packages (147 tools)
**Auditor:** Automated + manual review

## Summary

| Category                                       | Result     |
| ---------------------------------------------- | ---------- |
| Input validation (`assertNoFlagInjection`)     | 16/16 PASS |
| Command injection (no shell interpolation)     | 16/16 PASS |
| Zod `.max()` input limits on all string params | 16/16 PASS |
| Security test coverage                         | 16/16 PASS |
| Security policy controls (new)                 | PASS       |
| Overall                                        | PASS       |

## Methodology

1. Every tool's user-supplied string parameters were checked for `assertNoFlagInjection()` calls
2. Every `run()` / runner invocation verified to use `execFile` (no shell interpolation)
3. Every Zod schema checked for `.max(INPUT_LIMITS.*)` on strings and arrays
4. Security test files verified to cover all guarded parameters
5. v0.8.2-specific changes reviewed: new packages (security, k8s, process), new tools in existing packages, policy controls, ESLint expansion

## Findings

### v0.8.2 Changes Verified

No new vulnerabilities were introduced by v0.8.2 changes.

#### V1: New security policy infrastructure (INFO)

- **File:** `packages/shared/src/policy.ts`
- **Change:** New opt-in security controls — `assertAllowedByPolicy()`, `assertAllowedRoot()`, `assertNoPathQualifiedCommand()`
- **Controls:** `PARE_ALLOWED_COMMANDS`, `PARE_ALLOWED_ROOTS`, `PARE_BUILD_STRICT_PATH` environment variables
- **Risk assessment:** POSITIVE — these are purely additive hardening controls with no default behavior change
- **Decision:** Security improvement, no action needed

#### V2: New `@paretools/process` package (INFO)

- **File:** `packages/server-process/src/tools/run.ts`
- **Change:** Process executor that accepts arbitrary commands — intentionally powerful by design
- **Mitigation:** Uses `assertAllowedByPolicy()` and `assertAllowedRoot()` from the new policy module. When `PARE_PROCESS_ALLOWED_COMMANDS` or `PARE_ALLOWED_COMMANDS` is set, only whitelisted commands may execute
- **Decision:** Accepted risk with opt-in hardening — consistent with the build tool's `assertAllowedCommand()` pattern

#### V3: New `@paretools/security` package (INFO)

- **Files:** `packages/server-security/src/tools/trivy.ts`, `semgrep.ts`, `gitleaks.ts`
- **Change:** Security scanning tools wrapping trivy, semgrep, gitleaks
- **Verification:** All tools use `run()` (execFile), Zod schemas enforce INPUT_LIMITS, `assertNoFlagInjection()` applied to user-supplied parameters. Security test file covers all guarded parameters
- **Decision:** No security impact — read-only scanning tools with proper validation

#### V4: New `@paretools/k8s` package (INFO)

- **Files:** `packages/server-k8s/src/tools/apply.ts`, `describe.ts`, `get.ts`, `logs.ts`, `helm.ts`
- **Change:** Kubernetes operations wrapping kubectl and helm
- **Verification:** All 5 tools validate parameters with `assertNoFlagInjection()`, enforce INPUT_LIMITS via Zod schemas, and use `run()` for command execution. 45 security tests cover all guarded parameters
- **Decision:** No security impact — proper validation throughout

#### V5: New git tools (INFO)

- **Files:** `packages/server-git/src/tools/log-graph.ts`, `reflog.ts`, `bisect.ts`, `worktree.ts`
- **Change:** 4 new read/write git tools following existing patterns
- **Verification:** All use `assertNoFlagInjection()` on user-supplied ref/path/branch parameters, INPUT_LIMITS enforced, git-runner with `shell: false`
- **Decision:** Consistent with existing git tool security patterns

#### V6: New GitHub tools (INFO)

- **Files:** `packages/server-github/src/tools/run-rerun.ts`, `pr-checks.ts`, `pr-diff.ts`, `api.ts`, `gist-create.ts`, `release-create.ts`, `release-list.ts`
- **Change:** 7 new GitHub tools wrapping `gh` CLI
- **Verification:** All use `run()` (execFile), INPUT_LIMITS enforced. `release-create.ts`, `release-list.ts`, `pr-diff.ts` validate with `assertNoFlagInjection()`. The `api.ts` tool accepts arbitrary endpoints by design (similar to build tool's args). `gist-create.ts` accepts file paths. `run-rerun.ts` and `pr-checks.ts` use repo parameter passed as `--repo` flag
- **Decision:** Accepted — `gh` CLI tools operate within GitHub's auth boundary; the `api` tool is intentionally open-ended

#### V7: New Docker, Python, Build, Lint, npm, Test tools (INFO)

- **Files:** Multiple new tool files across 6 packages
- **Verification:** All follow existing package security patterns:
  - Docker: `compose-logs.ts`, `compose-build.ts`, `stats.ts` — assertNoFlagInjection on services/containers/buildArgs
  - Python: `conda.ts`, `pyenv.ts`, `poetry.ts` — assertNoFlagInjection on version/packages
  - Build: `turbo.ts`, `nx.ts` — assertNoFlagInjection on task/filter/target/project/base/args
  - Lint: `shellcheck.ts`, `hadolint.ts` — assertNoFlagInjection on patterns/registries/rules
  - npm: `nvm.ts` — enum-only action parameter, no string injection surface
  - Test: `playwright.ts` — assertNoFlagInjection on filter/project/args
- **Decision:** All consistent with existing patterns

#### V8: ESLint expansion to test/script files (INFO)

- **Change:** ESLint now covers `__tests__/**/*.ts` and `scripts/**/*.ts` in addition to `src/`
- **Impact:** Catches unused imports and variables in test code, improving code hygiene
- **Decision:** Positive quality improvement, no security impact

### Remediated Findings from Prior Audits

All findings below were identified and fixed in v0.7.0. They remain remediated in v0.8.2.

#### F1: `go env` — vars not validated (MEDIUM) — Fixed v0.7.0

- **File:** `packages/server-go/src/tools/env.ts`
- **Status:** `assertNoFlagInjection(v, "vars")` loop verified still in place

#### F2: `test run` — filter not validated (MEDIUM) — Fixed v0.7.0

- **File:** `packages/server-test/src/tools/run.ts`
- **Status:** `assertNoFlagInjection(filter, "filter")` verified still in place

#### F3: `git log` — author not validated (MEDIUM) — Fixed v0.7.0

- **File:** `packages/server-git/src/tools/log.ts`
- **Status:** `assertNoFlagInjection(author, "author")` verified still in place

#### F4: `git diff` — file not validated (LOW) — Fixed v0.7.0

- **File:** `packages/server-git/src/tools/diff.ts`
- **Status:** `assertNoFlagInjection(file, "file")` verified still in place

### Informational (Carried Forward)

#### I1: `go generate` — duplicate validation (INFO) — Cleaned v0.7.0

- **Status:** Verified clean in v0.8.2

#### I2: `build` tool — args intentionally unvalidated (INFO) — Accepted

- **File:** `packages/server-build/src/tools/build.ts`
- **Mitigation:** `command` parameter validated against allowlist of 24 build tools. `args` passed via `execFile` (no shell)
- **Status:** Unchanged, accepted risk

#### I3: `process run` — command intentionally open (INFO) — Accepted (NEW)

- **File:** `packages/server-process/src/tools/run.ts`
- **Mitigation:** `assertAllowedByPolicy()` and `assertAllowedRoot()` provide opt-in restrictions via `PARE_PROCESS_ALLOWED_COMMANDS` and `PARE_ALLOWED_ROOTS` environment variables
- **Status:** Accepted risk with opt-in hardening

#### I4: `gh api` — endpoint intentionally open (INFO) — Accepted (NEW)

- **File:** `packages/server-github/src/tools/api.ts`
- **Mitigation:** Operates within GitHub CLI's auth boundary. Endpoint is a REST path, not a shell command
- **Status:** Accepted risk — restricting endpoints would break the tool's purpose

## Package-by-Package Results

### All packages (v0.8.2)

| Package               | Flag injection     | Command injection | Input limits | Security tests |
| --------------------- | ------------------ | ----------------- | ------------ | -------------- |
| `@paretools/git`      | PASS               | PASS              | PASS         | PASS           |
| `@paretools/github`   | PASS (I4 accepted) | PASS              | PASS         | PASS           |
| `@paretools/search`   | PASS               | PASS              | PASS         | PASS           |
| `@paretools/test`     | PASS               | PASS              | PASS         | PASS           |
| `@paretools/npm`      | PASS               | PASS              | PASS         | PASS           |
| `@paretools/build`    | PASS (I2 accepted) | PASS              | PASS         | PASS           |
| `@paretools/lint`     | PASS               | PASS              | PASS         | PASS           |
| `@paretools/http`     | PASS (URL scheme)  | PASS              | PASS         | PASS           |
| `@paretools/make`     | PASS               | PASS              | PASS         | PASS           |
| `@paretools/python`   | PASS               | PASS              | PASS         | PASS           |
| `@paretools/docker`   | PASS               | PASS              | PASS         | PASS           |
| `@paretools/cargo`    | PASS               | PASS              | PASS         | PASS           |
| `@paretools/go`       | PASS               | PASS              | PASS         | PASS           |
| `@paretools/security` | PASS               | PASS              | PASS         | PASS           |
| `@paretools/k8s`      | PASS               | PASS              | PASS         | PASS           |
| `@paretools/process`  | PASS (I3 accepted) | PASS              | PASS         | PASS           |
| `@paretools/shared`   | N/A (utility)      | N/A               | N/A          | PASS           |

### Security Test Coverage by Package

| Package               | Test file                                            | Guarded parameters covered                                                                                                                                                                                                                                                     |
| --------------------- | ---------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `@paretools/git`      | `server-git/__tests__/security.test.ts`              | add/file, commit/message, push/remote+branch, pull/remote+branch, checkout/ref, diff/ref+file, log/author, blame/file, stash/message, bisect/good+bad, worktree/path+branch+base, reflog/ref, log-graph/ref + Zod                                                              |
| `@paretools/github`   | `server-github/__tests__/security.test.ts`           | pr-create/title+base+head, pr-list/author+label, issue-list/label+assignee, issue-create/title+labels[], run-list/branch, release-create/tag+target+title, pr-diff/repo, release-list/repo                                                                                     |
| `@paretools/http`     | `server-http/__tests__/security.test.ts`             | URL scheme validation, header CRLF injection, header key/value flag injection, --data-raw body safety, Zod constraints                                                                                                                                                         |
| `@paretools/search`   | `server-search/__tests__/security.test.ts`           | search/pattern+path+glob, find/extension                                                                                                                                                                                                                                       |
| `@paretools/make`     | `server-make/__tests__/security.test.ts`             | run/target+args[]                                                                                                                                                                                                                                                              |
| `@paretools/test`     | `server-test/__tests__/security.test.ts`             | run/filter+args[], playwright/filter+project+args[]                                                                                                                                                                                                                            |
| `@paretools/npm`      | `server-npm/__tests__/security.test.ts`              | install/args[], test/args[], run/script+args[]                                                                                                                                                                                                                                 |
| `@paretools/build`    | `server-build/__tests__/security.test.ts`            | assertAllowedCommand, esbuild/entryPoints+args[], tsc/project, vite-build/mode+args[], webpack/config+args[], build/args[], turbo/task+filter, nx/target+project+base+args[]                                                                                                   |
| `@paretools/lint`     | `server-lint/__tests__/security.test.ts`             | All 9 tools' patterns[] validation (including shellcheck, hadolint)                                                                                                                                                                                                            |
| `@paretools/docker`   | `server-docker/__tests__/security.test.ts`           | run/image+name+command+volumes+env+ports, exec/container+command+workdir+env, inspect/target, pull/image+platform, compose-logs/services, compose-build/services+buildArgs, stats/containers, assertValidPortMapping, assertSafeVolumeMount                                    |
| `@paretools/cargo`    | `server-cargo/__tests__/security.test.ts`            | check/package, test/filter, add/features+packages, run/args+package, remove/packages                                                                                                                                                                                           |
| `@paretools/go`       | `server-go/__tests__/security.test.ts`               | build/packages, test/packages+run, vet/packages, env/vars, generate/patterns, fmt/patterns, run/buildArgs, list/packages, get/packages                                                                                                                                         |
| `@paretools/python`   | `server-python/__tests__/security.test.ts`           | pytest/targets+markers, black/targets, mypy/targets, ruff/targets, pip-install/packages+requirements, pip-audit/requirements, pip-show/package, ruff-format/patterns, uv-install/packages+requirements, uv-run/command[0], conda/name+packages, pyenv/version, poetry/packages |
| `@paretools/security` | `server-security/__tests__/security.test.ts`         | trivy/severity+format+args[], semgrep/config+args[], gitleaks/args[]                                                                                                                                                                                                           |
| `@paretools/k8s`      | `server-k8s/__tests__/security.test.ts`              | kubectl-get/resource+name+namespace+label+field+output, kubectl-describe/resource+name+namespace, kubectl-logs/pod+container+namespace+since, kubectl-apply/file+namespace, helm/release+chart+namespace+repo+version+set+values                                               |
| `@paretools/process`  | `server-process/__tests__/security.test.ts`          | run/command+args[]+env keys/values, assertAllowedByPolicy, assertAllowedRoot                                                                                                                                                                                                   |
| `@paretools/shared`   | Tested via `server-build/__tests__/security.test.ts` | assertNoFlagInjection, assertAllowedCommand, assertAllowedByPolicy, assertAllowedRoot, assertNoPathQualifiedCommand                                                                                                                                                            |

## Security Architecture

All Pare servers follow these security patterns:

1. **No shell interpolation:** All commands use `execFile()` via the shared `run()` helper, never `exec()` or template strings
2. **Shell mode control:** The `run()` helper defaults to `shell: true` on Windows (for .cmd/.bat wrappers like npx) and `false` elsewhere. Callers can override via `RunOptions.shell` — notably, `git-runner` uses `shell: false` to prevent cmd.exe from mangling `<>` characters in git format strings
3. **Windows cmd.exe escaping:** When shell mode is active on Windows, `escapeCmdArg()` escapes metacharacters (`^`, `&`, `|`, `<`, `>`, `!`) and double-quotes args containing spaces
4. **Flag injection prevention:** Every user-supplied string passed as a CLI positional argument is validated with `assertNoFlagInjection()`, which rejects values starting with `-` (including after whitespace trimming)
5. **Command allowlist** (build package): The `assertAllowedCommand()` function restricts executable names to a known-safe set of 24 build tools
6. **Security policy controls** (new in v0.8.2): `assertAllowedByPolicy()` validates commands against optional allowlists (`PARE_ALLOWED_COMMANDS`, `PARE_{SERVER}_ALLOWED_COMMANDS`). `assertAllowedRoot()` validates paths against optional root directories (`PARE_ALLOWED_ROOTS`, `PARE_{SERVER}_ALLOWED_ROOTS`). `assertNoPathQualifiedCommand()` blocks path-qualified commands when `PARE_BUILD_STRICT_PATH=true`
7. **Input size limits:** All Zod schemas use `.max(INPUT_LIMITS.*)` constraints — STRING_MAX (65,536), ARRAY_MAX (1,000), PATH_MAX (4,096), MESSAGE_MAX (72,000), SHORT_STRING_MAX (255)
8. **URL scheme validation** (http package): Only `http://` and `https://` schemes are allowed via `assertSafeUrl()`
9. **CRLF injection prevention** (http package): Header keys and values are validated against `\r`, `\n`, and `\x00` via `assertSafeHeader()`
10. **Body safety** (http package): Request bodies use `--data-raw` to prevent curl `@file` expansion
11. **Volume mount validation** (docker package): `assertSafeVolumeMount()` blocks dangerous host paths (`/`, `/etc`, `/proc`, `/sys`, `/dev`, `/root`, `/var/run/docker.sock`, Windows root drives) and normalizes path traversal attempts
12. **Port mapping validation** (docker package): `assertValidPortMapping()` uses regex to validate Docker port mapping format
13. **Error sanitization:** Error output is sanitized via `sanitizeErrorOutput()` to prevent leaking absolute file paths or internal state
