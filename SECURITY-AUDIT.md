# Security Audit — Pare v0.8.0

**Date:** 2026-02-13
**Scope:** All 16 packages (147 tools)
**Auditor:** Automated + manual review

## Summary

| Category                                       | Result     |
| ---------------------------------------------- | ---------- |
| Input validation (`assertNoFlagInjection`)     | 14/14 PASS |
| Command injection (no shell interpolation)     | 14/14 PASS |
| Zod `.max()` input limits on all string params | 14/14 PASS |
| Security test coverage                         | 14/14 PASS |
| Overall                                        | PASS       |

## Methodology

1. Every tool's user-supplied string parameters were checked for `assertNoFlagInjection()` calls
2. Every `run()` / runner invocation verified to use `execFile` (no shell interpolation)
3. Every Zod schema checked for `.max(INPUT_LIMITS.*)` on strings and arrays
4. Security test files verified to cover all guarded parameters
5. v0.8.0-specific changes reviewed: `RunOptions.shell` override, `git-runner` explicit `shell: false`, output schema trims, merged author+email field

## Findings

### v0.8.0 Changes Verified

No new vulnerabilities were introduced by v0.8.0 changes.

#### V1: `RunOptions.shell` override capability (INFO)

- **File:** `packages/shared/src/runner.ts`
- **Change:** The `run()` helper now accepts an optional `shell` boolean in `RunOptions`, allowing callers to override the default shell behavior (which is `true` on Windows, `false` elsewhere)
- **Risk assessment:** LOW — The default behavior is unchanged (safe). Only internal runner files set this option; it is not exposed to MCP tool callers. The git-runner uses `shell: false` to prevent cmd.exe from mangling `<>` characters in format strings, which is a security improvement
- **Decision:** Safe by design — callers are internal trusted code, not user-supplied input

#### V2: `git-runner` explicit `shell: false` (INFO)

- **File:** `packages/server-git/src/lib/git-runner.ts`
- **Change:** The git runner now explicitly passes `shell: false` to `run()`, bypassing cmd.exe on Windows
- **Impact:** Positive — eliminates cmd.exe metacharacter risks for git commands entirely. The `escapeCmdArg()` function is no longer invoked for git args since shell mode is disabled
- **Decision:** Security improvement, no action needed

#### V3: Output schema trims (INFO)

- **Change:** Various output schemas were trimmed/simplified across packages in v0.8.0
- **Verification:** All trims affected output schemas (structuredContent), not input schemas. No `.max()` constraints or `assertNoFlagInjection()` calls were removed
- **Decision:** No security impact — input validation is fully preserved

#### V4: Merged author+email field in git log/show (INFO)

- **Files:** `packages/server-git/src/tools/log.ts`, `packages/server-git/src/tools/show.ts`
- **Change:** The `%an` and `%ae` format placeholders were merged into a single `%an <%ae>` field
- **Verification:** These format strings are hardcoded constants, not user-supplied. The author filter parameter in `log.ts` is still validated with `assertNoFlagInjection()`
- **Decision:** No security impact — format strings are not user-controlled

### Remediated Findings from Prior Audits

All findings below were identified and fixed in v0.7.0. They remain remediated in v0.8.0.

#### F1: `go env` — vars not validated (MEDIUM) — Fixed v0.7.0

- **File:** `packages/server-go/src/tools/env.ts`
- **Issue:** The `vars` array items were passed directly to `go env -json` without `assertNoFlagInjection()`
- **Fix:** Added `assertNoFlagInjection(v, "vars")` loop before command execution
- **Status:** Verified still in place

#### F2: `test run` — filter not validated (MEDIUM) — Fixed v0.7.0

- **File:** `packages/server-test/src/tools/run.ts`
- **Issue:** The `filter` parameter was passed to test framework CLI flags without validation
- **Fix:** Added `assertNoFlagInjection(filter, "filter")` before the switch statement
- **Status:** Verified still in place

#### F3: `git log` — author not validated (MEDIUM) — Fixed v0.7.0

- **File:** `packages/server-git/src/tools/log.ts`
- **Issue:** The `author` parameter was passed as `--author=<value>` without checking for flag injection
- **Fix:** Added `assertNoFlagInjection(author, "author")` before pushing to args
- **Status:** Verified still in place

#### F4: `git diff` — file not validated (LOW) — Fixed v0.7.0

- **File:** `packages/server-git/src/tools/diff.ts`
- **Issue:** The `file` parameter was passed after `--` separator but lacked explicit validation
- **Fix:** Added `assertNoFlagInjection(file, "file")` before pushing to args
- **Status:** Verified still in place

### Informational (Carried Forward)

#### I1: `go generate` — duplicate validation (INFO) — Cleaned v0.7.0

- **File:** `packages/server-go/src/tools/generate.ts`
- **Status:** Duplicate validation loop removed in v0.7.0, verified clean in v0.8.0

#### I2: `build` tool — args intentionally unvalidated (INFO) — Accepted

- **File:** `packages/server-build/src/tools/build.ts`
- **Issue:** The `args` parameter accepts arbitrary flags by design (e.g., `['run', 'build']`)
- **Mitigation:** The `command` parameter is validated against an allowlist (`npm`, `npx`, `pnpm`, `yarn`, `bun`, `bunx`, `make`, `cmake`, `gradle`, `gradlew`, `mvn`, `ant`, `cargo`, `go`, `dotnet`, `msbuild`, `tsc`, `esbuild`, `vite`, `webpack`, `rollup`, `turbo`, `nx`, `bazel`), limiting the blast radius. The `args` are passed via `execFile` (no shell), preventing command injection.
- **Decision:** Accepted risk — restricting args would break the tool's purpose

## Package-by-Package Results

### All packages (v0.8.0)

| Package             | Flag injection               | Command injection | Input limits | Security tests |
| ------------------- | ---------------------------- | ----------------- | ------------ | -------------- |
| `@paretools/git`    | PASS                         | PASS              | PASS         | PASS           |
| `@paretools/github` | PASS                         | PASS              | PASS         | PASS           |
| `@paretools/search` | PASS                         | PASS              | PASS         | PASS           |
| `@paretools/test`   | PASS                         | PASS              | PASS         | PASS           |
| `@paretools/npm`    | PASS                         | PASS              | PASS         | PASS           |
| `@paretools/build`  | PASS (I2 accepted)           | PASS              | PASS         | PASS           |
| `@paretools/lint`   | PASS                         | PASS              | PASS         | PASS           |
| `@paretools/http`   | PASS (URL scheme validation) | PASS              | PASS         | PASS           |
| `@paretools/make`   | PASS                         | PASS              | PASS         | PASS           |
| `@paretools/python` | PASS                         | PASS              | PASS         | PASS           |
| `@paretools/docker` | PASS                         | PASS              | PASS         | PASS           |
| `@paretools/cargo`  | PASS                         | PASS              | PASS         | PASS           |
| `@paretools/go`     | PASS                         | PASS              | PASS         | PASS           |
| `@paretools/shared` | N/A (utility)                | N/A               | N/A          | PASS           |

### Security Test Coverage by Package

| Package             | Test file                                            | Guarded parameters covered                                                                                                                                                                                                |
| ------------------- | ---------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `@paretools/git`    | `server-git/__tests__/security.test.ts`              | add/file, commit/message, push/remote+branch, pull/remote+branch, checkout/ref, diff/ref+file, log/author, blame/file, stash/message + Zod constraints                                                                    |
| `@paretools/github` | `server-github/__tests__/security.test.ts`           | pr-create/title+base+head, pr-list/author+label, issue-list/label+assignee, issue-create/title+labels[], run-list/branch                                                                                                  |
| `@paretools/http`   | `server-http/__tests__/security.test.ts`             | URL scheme validation, header CRLF injection, header key/value flag injection, --data-raw body safety, Zod constraints                                                                                                    |
| `@paretools/search` | `server-search/__tests__/security.test.ts`           | search/pattern+path+glob, find/extension                                                                                                                                                                                  |
| `@paretools/make`   | `server-make/__tests__/security.test.ts`             | run/target+args[]                                                                                                                                                                                                         |
| `@paretools/test`   | `server-test/__tests__/security.test.ts`             | run/filter+args[]                                                                                                                                                                                                         |
| `@paretools/npm`    | `server-npm/__tests__/security.test.ts`              | install/args[], test/args[], run/script+args[]                                                                                                                                                                            |
| `@paretools/build`  | `server-build/__tests__/security.test.ts`            | assertAllowedCommand, esbuild/entryPoints+args[], tsc/project, vite-build/mode+args[], webpack/config+args[], build/args[]                                                                                                |
| `@paretools/lint`   | `server-lint/__tests__/security.test.ts`             | All 7 tools' patterns[] validation                                                                                                                                                                                        |
| `@paretools/docker` | `server-docker/__tests__/security.test.ts`           | run/image+name+command+volumes+env+ports, exec/container+command+workdir+env, inspect/target, pull/image+platform, assertValidPortMapping, assertSafeVolumeMount                                                          |
| `@paretools/cargo`  | `server-cargo/__tests__/security.test.ts`            | check/package, test/filter, add/features+packages, run/args+package, remove/packages                                                                                                                                      |
| `@paretools/go`     | `server-go/__tests__/security.test.ts`               | build/packages, test/packages+run, vet/packages, env/vars, generate/patterns, fmt/patterns, run/buildArgs, list/packages, get/packages                                                                                    |
| `@paretools/python` | `server-python/__tests__/security.test.ts`           | pytest/targets+markers, black/targets, mypy/targets, ruff/targets, pip-install/packages+requirements, pip-audit/requirements, pip-show/package, ruff-format/patterns, uv-install/packages+requirements, uv-run/command[0] |
| `@paretools/shared` | Tested via `server-build/__tests__/security.test.ts` | assertNoFlagInjection, assertAllowedCommand                                                                                                                                                                               |

## Security Architecture

All Pare servers follow these security patterns:

1. **No shell interpolation:** All commands use `execFile()` via the shared `run()` helper, never `exec()` or template strings
2. **Shell mode control:** The `run()` helper defaults to `shell: true` on Windows (for .cmd/.bat wrappers like npx) and `false` elsewhere. Callers can override via `RunOptions.shell` — notably, `git-runner` uses `shell: false` to prevent cmd.exe from mangling `<>` characters in git format strings
3. **Windows cmd.exe escaping:** When shell mode is active on Windows, `escapeCmdArg()` escapes metacharacters (`^`, `&`, `|`, `<`, `>`, `!`) and double-quotes args containing spaces
4. **Flag injection prevention:** Every user-supplied string passed as a CLI positional argument is validated with `assertNoFlagInjection()`, which rejects values starting with `-` (including after whitespace trimming)
5. **Command allowlist** (build package): The `assertAllowedCommand()` function restricts executable names to a known-safe set of 24 build tools
6. **Input size limits:** All Zod schemas use `.max(INPUT_LIMITS.*)` constraints — STRING_MAX (65,536), ARRAY_MAX (1,000), PATH_MAX (4,096), MESSAGE_MAX (72,000), SHORT_STRING_MAX (255)
7. **URL scheme validation** (http package): Only `http://` and `https://` schemes are allowed via `assertSafeUrl()`
8. **CRLF injection prevention** (http package): Header keys and values are validated against `\r`, `\n`, and `\x00` via `assertSafeHeader()`
9. **Body safety** (http package): Request bodies use `--data-raw` to prevent curl `@file` expansion
10. **Volume mount validation** (docker package): `assertSafeVolumeMount()` blocks dangerous host paths (`/`, `/etc`, `/proc`, `/sys`, `/dev`, `/root`, `/var/run/docker.sock`, Windows root drives) and normalizes path traversal attempts
11. **Port mapping validation** (docker package): `assertValidPortMapping()` uses regex to validate Docker port mapping format
12. **Error sanitization:** Error output is sanitized via `sanitizeErrorOutput()` to prevent leaking absolute file paths or internal state
