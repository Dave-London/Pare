# Security Audit — Pare v0.12.0

**Date:** 2026-02-23
**Scope:** All 26 packages (248 tools)
**Auditor:** Automated + manual review

## Summary

| Category                                       | Result     |
| ---------------------------------------------- | ---------- |
| Input validation (`assertNoFlagInjection`)     | 26/26 PASS |
| Command injection (no shell interpolation)     | 26/26 PASS |
| Zod `.max()` input limits on all string params | 26/26 PASS |
| Security test coverage                         | 26/26 PASS |
| Security policy controls                       | PASS       |
| Overall                                        | PASS       |

## Methodology

1. Every tool's user-supplied string parameters were checked for `assertNoFlagInjection()` calls
2. Every `run()` / runner invocation verified to use `execFile` (no shell interpolation)
3. Every Zod schema checked for `.max(INPUT_LIMITS.*)` on strings and arrays
4. Security test files verified to cover all guarded parameters
5. v0.12.0-specific changes reviewed: 10 new packages, expanded tools in 4 existing packages, structured error categorization, centralized input schemas, createServer factory

## Changes Since v0.8.2

### New Packages (10)

#### V9: `@paretools/infra` — Terraform, Vagrant, Ansible (PASS)

- **Tools:** terraform (init, plan, show, state-list, validate, fmt, output, workspace), vagrant (status, global-status, up, halt, destroy), ansible (playbook, inventory, galaxy)
- **Verification:** All tools use `run()` (execFile). `assertNoFlagInjection()` applied to `out`, `target`, `varFile`, `machine`, `branch`. Terraform vars safely unpacked via `args.push("-var", "${key}=${value}")` (no string interpolation). Vagrant destroy gated by `assertAllowedByPolicy("vagrant", "infra")`
- **Security tests:** Added — `server-infra/__tests__/security.test.ts`
- **Decision:** PASS — proper validation, policy gate on destructive operation

#### V10: `@paretools/remote` — SSH, rsync, SCP (PASS)

- **Tools:** ssh-run, ssh-test, ssh-keyscan, rsync
- **Verification:** All tools use `run()` (execFile). `assertNoFlagInjection()` applied to `host`, `user`, `identityFile`, and each item in `options` array
- **Accepted risk:** `command` parameter in ssh-run accepts arbitrary strings — inherent to SSH execution, documented with WARNING in tool description
- **Security tests:** Added — `server-remote/__tests__/security.test.ts`
- **Decision:** PASS with accepted risk

#### V11: `@paretools/db` — PostgreSQL, MySQL, MongoDB, Redis (PASS)

- **Tools:** psql-query, psql-list-databases, mysql-query, mysql-list-databases, redis-ping, redis-info, redis-command, mongosh-eval, mongosh-stats
- **Verification:** All tools use `run()` (execFile). `assertNoFlagInjection()` applied to `database`, `host`, `user` connection parameters
- **Accepted risk:** `query`/`command` parameters accept arbitrary strings — inherent to database tools, documented with WARNING in tool descriptions
- **Security tests:** Added — `server-db/__tests__/security.test.ts`
- **Decision:** PASS with accepted risk

#### V12: `@paretools/jvm` — Gradle, Maven (PASS)

- **Tools:** gradle (build, dependencies, tasks, test), maven (build, dependencies, test, verify)
- **Verification:** All tools use `run()` (execFile). `assertNoFlagInjection()` applied to each item in `tasks`/`targets` arrays
- **Accepted risk:** `args` arrays not individually validated — intentional for build tool CLI flags, size-limited by schema
- **Security tests:** Added — `server-jvm/__tests__/security.test.ts`
- **Decision:** PASS with accepted risk (consistent with existing build tool pattern)

#### V13: `@paretools/bun` — Bun Runtime (PASS)

- **Tools:** add, remove, install, build, run, test, outdated, pm-ls, create
- **Verification:** All tools use `run()` (execFile). `assertNoFlagInjection()` applied to each item in `packages` arrays
- **Security tests:** Added — `server-bun/__tests__/security.test.ts`
- **Decision:** PASS

#### V14: `@paretools/deno` — Deno Runtime (PASS)

- **Tools:** run, check, fmt, lint, test, info, bench, task
- **Verification:** All tools use `run()` (execFile). `assertNoFlagInjection()` applied to `file` parameter. Permission flags are boolean enums (no injection surface)
- **Accepted risk:** `args` array items not individually validated — size-limited by schema. Deno's permission model provides defense-in-depth
- **Security tests:** Added — `server-deno/__tests__/security.test.ts`
- **Decision:** PASS

#### V15: `@paretools/dotnet` — .NET (PASS)

- **Tools:** add-package, build, clean, list-package, publish, restore, run, test, format
- **Verification:** All tools use `run()` (execFile). `assertNoFlagInjection()` applied to `project`, `configuration`, `framework`, `runtime`, `output`, `package` parameters
- **Security tests:** Added — `server-dotnet/__tests__/security.test.ts`
- **Decision:** PASS

#### V16: `@paretools/ruby` — Ruby Ecosystem (PASS)

- **Tools:** bundle (check, exec, install), gem (install, list, outdated), ruby run, rspec, rubocop, erb, rdoc, yard
- **Verification:** All tools use `run()` (execFile). `assertNoFlagInjection()` applied to `file`, `gem` parameters
- **Security tests:** Added — `server-ruby/__tests__/security.test.ts`
- **Decision:** PASS

#### V17: `@paretools/bazel` — Bazel Build System (PASS)

- **Tools:** build, test (unified tool with multiple actions)
- **Verification:** All tools use `run()` (execFile). `assertNoFlagInjection()` applied to `targets`, `queryExpr`, `infoKey`. Additional pattern validation ensures targets match Bazel conventions (`//`, `@`, or `...`). Policy gates on `bazel run` and `bazel clean --expunge` via `assertAllowedByPolicy("bazel", "bazel")`
- **Security tests:** Added — `server-bazel/__tests__/security.test.ts`
- **Decision:** PASS — extra defense-in-depth with target pattern validation

#### V18: `@paretools/cmake` — CMake (PASS)

- **Tools:** configure, build (unified tool with multiple actions)
- **Verification:** All tools use `run()` (execFile). `assertNoFlagInjection()` applied to `sourceDir`, `buildDir`, `target`, `cacheKey`, `cacheValue`. Cache key regex validation blocks special characters. `cmake install` gated by `assertAllowedByPolicy("cmake", "cmake")`
- **Security tests:** Comprehensive — cache key regex validation, flag injection, policy gates, Zod limits
- **Decision:** PASS

### Expanded Existing Packages

#### V19: `@paretools/git` — New tools (archive, submodule, config, clean) (PASS)

- **Verification:** All follow existing git security patterns. `assertNoFlagInjection()` on `tree`, `prefix`, `output` (archive), `url`, `submodulePath`, `branch` (submodule), `key`, `value` (config), `paths` array items (clean). All use git-runner with `shell: false`
- **Decision:** Consistent with existing patterns

#### V20: `@paretools/github` — New tools (repo-view, repo-clone, discussion-list) (PASS)

- **Verification:** Read-only operations following existing github tool patterns. `repo` parameter guarded
- **Decision:** Consistent with existing patterns

#### V21: `@paretools/build` — New tools (lerna, rollup) (PASS)

- **Verification:** `assertNoFlagInjection()` on `script`, `scope` (lerna), `config`, `input`, `output`, `name` (rollup)
- **Accepted risk:** `args` arrays not individually validated — consistent with existing build tool pattern
- **Decision:** PASS with accepted risk

#### V22: `@paretools/search` — New tool (yq) (PASS)

- **Verification:** `assertNoFlagInjection()` on `expression`, `file`, `files` parameters. `inPlace` mode defaults to false with documented "DANGER" warning requiring explicit opt-in
- **Accepted risk:** `expression` accepts arbitrary yq expressions — intentional, documented WARNING
- **Decision:** PASS with accepted risk

### Shared Infrastructure Changes

#### V23: Structured error categorization (PASS)

- **File:** `packages/shared/src/errors.ts`
- **Change:** New `PareErrorCategory` enum with 12 error categories for agent recovery
- **Risk assessment:** POSITIVE — categorized errors prevent agents from leaking raw error details
- **Decision:** No security impact

#### V24: Centralized input schemas (PASS)

- **File:** `packages/shared/src/schemas/`
- **Change:** Common parameters (`compactInput`, `projectPathInput`, `repoPathInput`, `cwdPathInput`, etc.) defined once and reused across all tools
- **Risk assessment:** POSITIVE — eliminates risk of inconsistent validation across packages
- **Decision:** Security improvement

#### V25: `createServer()` factory (PASS)

- **File:** `packages/shared/src/server.ts`
- **Change:** Eliminates boilerplate, standardizes server creation
- **Risk assessment:** NEUTRAL — no change to security behavior
- **Decision:** No security impact

#### V26: ANSI regex ReDoS fix (PASS)

- **File:** `packages/shared/src/ansi.ts`
- **Change:** Replaced `[0-?]*[ -/]*[@-~]` with `[\d;?]*[A-Za-z]` to eliminate polynomial backtracking (CodeQL alert #14)
- **Risk assessment:** POSITIVE — eliminates ReDoS vector in stripAnsi
- **Decision:** Security fix

#### V27: Dependency vulnerability overrides (PASS)

- **File:** `package.json` pnpm overrides
- **Change:** Added overrides for ajv>=8.18.0 (ReDoS), hono>=4.11.10 (timing comparison), qs>=6.14.2 (arrayLimit bypass)
- **Risk assessment:** POSITIVE — resolves all known transitive dependency vulnerabilities
- **Decision:** Security fix

### Remediated Findings from Prior Audits

All findings below were identified and fixed in v0.7.0. They remain remediated in v0.12.0.

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

### Informational (Carried Forward + New)

#### I1: `go generate` — duplicate validation (INFO) — Cleaned v0.7.0

- **Status:** Verified clean in v0.12.0

#### I2: `build` tool — args intentionally unvalidated (INFO) — Accepted

- **File:** `packages/server-build/src/tools/build.ts`
- **Mitigation:** `command` parameter validated against allowlist of build tools. `args` passed via `execFile` (no shell)
- **Status:** Unchanged, accepted risk

#### I3: `process run` — command intentionally open (INFO) — Accepted

- **File:** `packages/server-process/src/tools/run.ts`
- **Mitigation:** `assertAllowedByPolicy()` and `assertAllowedRoot()` provide opt-in restrictions
- **Status:** Unchanged, accepted risk

#### I4: `gh api` — endpoint intentionally open (INFO) — Accepted

- **File:** `packages/server-github/src/tools/api.ts`
- **Mitigation:** Operates within GitHub CLI's auth boundary
- **Status:** Unchanged, accepted risk

#### I5: SSH command — intentionally open (INFO) — Accepted (NEW)

- **File:** `packages/server-remote/src/tools/ssh-run.ts`
- **Mitigation:** Inherent to SSH. Documented WARNING in tool description
- **Status:** Accepted risk

#### I6: Database queries — intentionally open (INFO) — Accepted (NEW)

- **Files:** `packages/server-db/src/tools/psql-query.ts`, `mysql-query.ts`, `mongosh-eval.ts`, `redis-command.ts`
- **Mitigation:** Inherent to database tools. Documented WARNING in tool descriptions
- **Status:** Accepted risk

#### I7: yq expressions — intentionally open (INFO) — Accepted (NEW)

- **File:** `packages/server-search/src/tools/yq.ts`
- **Mitigation:** `inPlace` mode defaults to false with "DANGER" warning requiring explicit opt-in
- **Status:** Accepted risk

## Package-by-Package Results

### All packages (v0.12.0)

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
| `@paretools/infra`    | PASS               | PASS              | PASS         | PASS           |
| `@paretools/remote`   | PASS (I5 accepted) | PASS              | PASS         | PASS           |
| `@paretools/db`       | PASS (I6 accepted) | PASS              | PASS         | PASS           |
| `@paretools/jvm`      | PASS               | PASS              | PASS         | PASS           |
| `@paretools/bun`      | PASS               | PASS              | PASS         | PASS           |
| `@paretools/deno`     | PASS               | PASS              | PASS         | PASS           |
| `@paretools/dotnet`   | PASS               | PASS              | PASS         | PASS           |
| `@paretools/ruby`     | PASS               | PASS              | PASS         | PASS           |
| `@paretools/bazel`    | PASS               | PASS              | PASS         | PASS           |
| `@paretools/cmake`    | PASS               | PASS              | PASS         | PASS           |

### Security Test Coverage by Package

| Package               | Test file                                            | Guarded parameters covered                                                                                                                                                                                                                                                                                       |
| --------------------- | ---------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `@paretools/git`      | `server-git/__tests__/security.test.ts`              | add/file, commit/message, push/remote+branch, pull/remote+branch, checkout/ref, diff/ref+file, log/author, blame/file, stash/message, bisect/good+bad, worktree/path+branch+base, reflog/ref, log-graph/ref, submodule/url+submodulePath+branch, config/key+value, archive/tree+prefix+output, clean/paths + Zod |
| `@paretools/github`   | `server-github/__tests__/security.test.ts`           | pr-create/title+base+head, pr-list/author+label, issue-list/label+assignee, issue-create/title+labels[], run-list/branch, release-create/tag+target+title, pr-diff/repo, release-list/repo                                                                                                                       |
| `@paretools/http`     | `server-http/__tests__/security.test.ts`             | URL scheme validation, header CRLF injection, header key/value flag injection, --data-raw body safety, Zod constraints                                                                                                                                                                                           |
| `@paretools/search`   | `server-search/__tests__/security.test.ts`           | search/pattern+path+glob, find/extension                                                                                                                                                                                                                                                                         |
| `@paretools/make`     | `server-make/__tests__/security.test.ts`             | run/target+args[]                                                                                                                                                                                                                                                                                                |
| `@paretools/test`     | `server-test/__tests__/security.test.ts`             | run/filter+args[], playwright/filter+project+args[]                                                                                                                                                                                                                                                              |
| `@paretools/npm`      | `server-npm/__tests__/security.test.ts`              | install/args[], test/args[], run/script+args[]                                                                                                                                                                                                                                                                   |
| `@paretools/build`    | `server-build/__tests__/security.test.ts`            | assertAllowedCommand, esbuild/entryPoints+args[], tsc/project, vite-build/mode+args[], webpack/config+args[], build/args[], turbo/task+filter, nx/target+project+base+args[]                                                                                                                                     |
| `@paretools/lint`     | `server-lint/__tests__/security.test.ts`             | All 10 tools' patterns[] validation (including shellcheck, hadolint)                                                                                                                                                                                                                                             |
| `@paretools/docker`   | `server-docker/__tests__/security.test.ts`           | run/image+name+command+volumes+env+ports, exec/container+command+workdir+env, inspect/target, pull/image+platform, compose-logs/services, compose-build/services+buildArgs, stats/containers, assertValidPortMapping, assertSafeVolumeMount                                                                      |
| `@paretools/cargo`    | `server-cargo/__tests__/security.test.ts`            | check/package, test/filter, add/features+packages, run/args+package, remove/packages                                                                                                                                                                                                                             |
| `@paretools/go`       | `server-go/__tests__/security.test.ts`               | build/packages, test/packages+run, vet/packages, env/vars, generate/patterns, fmt/patterns, run/buildArgs, list/packages, get/packages                                                                                                                                                                           |
| `@paretools/python`   | `server-python/__tests__/security.test.ts`           | pytest/targets+markers, black/targets, mypy/targets, ruff/targets, pip-install/packages+requirements, pip-audit/requirements, pip-show/package, ruff-format/patterns, uv-install/packages+requirements, uv-run/command[0], conda/name+packages, pyenv/version, poetry/packages                                   |
| `@paretools/security` | `server-security/__tests__/security.test.ts`         | trivy/severity+format+args[], semgrep/config+args[], gitleaks/args[]                                                                                                                                                                                                                                             |
| `@paretools/k8s`      | `server-k8s/__tests__/security.test.ts`              | kubectl-get/resource+name+namespace+label+field+output, kubectl-describe/resource+name+namespace, kubectl-logs/pod+container+namespace+since, kubectl-apply/file+namespace, helm/release+chart+namespace+repo+version+set+values                                                                                 |
| `@paretools/process`  | `server-process/__tests__/security.test.ts`          | run/command+args[]+env keys/values, assertAllowedByPolicy, assertAllowedRoot                                                                                                                                                                                                                                     |
| `@paretools/shared`   | Tested via `server-build/__tests__/security.test.ts` | assertNoFlagInjection, assertAllowedCommand, assertAllowedByPolicy, assertAllowedRoot, assertNoPathQualifiedCommand                                                                                                                                                                                              |
| `@paretools/cmake`    | `server-cmake/__tests__/security.test.ts`            | cache key regex validation, assertNoFlagInjection on sourceDir+buildDir+target, assertAllowedByPolicy for install, Zod limits                                                                                                                                                                                    |

### Previously Missing Security Tests (Resolved)

The following 9 packages previously lacked dedicated `security.test.ts` files. All have been added as of v0.13.0:

| Package             | Guards present in source                                                  | Security tests |
| ------------------- | ------------------------------------------------------------------------- | -------------- |
| `@paretools/infra`  | assertNoFlagInjection, assertAllowedByPolicy (vagrant destroy)            | Added          |
| `@paretools/remote` | assertNoFlagInjection on host/user/options                                | Added          |
| `@paretools/db`     | assertNoFlagInjection on connection params                                | Added          |
| `@paretools/jvm`    | assertNoFlagInjection on task arrays                                      | Added          |
| `@paretools/bun`    | assertNoFlagInjection on package names                                    | Added          |
| `@paretools/deno`   | assertNoFlagInjection on file paths                                       | Added          |
| `@paretools/dotnet` | assertNoFlagInjection on project/config/framework                         | Added          |
| `@paretools/ruby`   | assertNoFlagInjection on file/gem params                                  | Added          |
| `@paretools/bazel`  | assertNoFlagInjection + target pattern validation + assertAllowedByPolicy | Added          |

## Security Architecture

All Pare servers follow these security patterns:

1. **No shell interpolation:** All commands use `execFile()` via the shared `run()` helper, never `exec()` or template strings
2. **Shell mode control:** The `run()` helper defaults to `shell: true` on Windows (for .cmd/.bat wrappers like npx) and `false` elsewhere. Callers can override via `RunOptions.shell` — notably, `git-runner` uses `shell: false` to prevent cmd.exe from mangling `<>` characters in git format strings
3. **Windows cmd.exe escaping:** When shell mode is active on Windows, `escapeCmdArg()` escapes metacharacters (`^`, `&`, `|`, `<`, `>`, `!`) and double-quotes args containing spaces
4. **Flag injection prevention:** Every user-supplied string passed as a CLI positional argument is validated with `assertNoFlagInjection()`, which rejects values starting with `-` (including after whitespace trimming)
5. **Command allowlist** (build package): The `assertAllowedCommand()` function restricts executable names to a known-safe set of build tools
6. **Security policy controls:** `assertAllowedByPolicy()` validates commands against optional allowlists (`PARE_ALLOWED_COMMANDS`, `PARE_{SERVER}_ALLOWED_COMMANDS`). `assertAllowedRoot()` validates paths against optional root directories (`PARE_ALLOWED_ROOTS`, `PARE_{SERVER}_ALLOWED_ROOTS`). `assertNoPathQualifiedCommand()` blocks path-qualified commands when `PARE_BUILD_STRICT_PATH=true`
7. **Input size limits:** All Zod schemas use `.max(INPUT_LIMITS.*)` constraints — STRING_MAX (65,536), ARRAY_MAX (1,000), PATH_MAX (4,096), MESSAGE_MAX (72,000), SHORT_STRING_MAX (255)
8. **URL scheme validation** (http package): Only `http://` and `https://` schemes are allowed via `assertSafeUrl()`
9. **CRLF injection prevention** (http package): Header keys and values are validated against `\r`, `\n`, and `\x00` via `assertSafeHeader()`
10. **Body safety** (http package): Request bodies use `--data-raw` to prevent curl `@file` expansion
11. **Volume mount validation** (docker package): `assertSafeVolumeMount()` blocks dangerous host paths (`/`, `/etc`, `/proc`, `/sys`, `/dev`, `/root`, `/var/run/docker.sock`, Windows root drives) and normalizes path traversal attempts
12. **Port mapping validation** (docker package): `assertValidPortMapping()` uses regex to validate Docker port mapping format
13. **Error sanitization:** Error output is sanitized via `sanitizeErrorOutput()` to prevent leaking absolute file paths or internal state
14. **Structured error categorization** (new): Errors categorized into 12 types (`command-not-found`, `permission-denied`, `timeout`, etc.) preventing raw error text exposure
15. **Centralized input schemas** (new): Common parameters defined once in `@paretools/shared` ensuring consistent validation across all 248 tools
