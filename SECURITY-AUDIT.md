# Security Audit — Pare v0.7.0

**Date:** 2026-02-12
**Scope:** All 14 packages (100 tools)
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

## Findings

### Remediated (v0.7.0)

All findings below were identified and fixed before release.

#### F1: `go env` — vars not validated (MEDIUM)

- **File:** `packages/server-go/src/tools/env.ts`
- **Issue:** The `vars` array items were passed directly to `go env -json` without `assertNoFlagInjection()`
- **Risk:** A malicious input like `--exec=...` could be interpreted as a Go CLI flag
- **Fix:** Added `assertNoFlagInjection(v, "vars")` loop before command execution
- **Test:** Added `security: go env — vars validation` test block

#### F2: `test run` — filter not validated (MEDIUM)

- **File:** `packages/server-test/src/tools/run.ts`
- **Issue:** The `filter` parameter was passed to test framework CLI flags (`-k`, `--testPathPattern`, `--grep`) without validation
- **Risk:** A flag-like filter value could inject additional CLI flags into the test runner
- **Fix:** Added `assertNoFlagInjection(filter, "filter")` before the switch statement
- **Test:** Added `security: test run — filter validation` test block

#### F3: `git log` — author not validated (MEDIUM)

- **File:** `packages/server-git/src/tools/log.ts`
- **Issue:** The `author` parameter was passed as `--author=<value>` without checking for flag injection
- **Risk:** While `--author=` prefix limits exploitation, the parameter should follow the same validation pattern as all other user inputs
- **Fix:** Added `assertNoFlagInjection(author, "author")` before pushing to args
- **Test:** Added `security: log tool — author validation` test block

#### F4: `git diff` — file not validated (LOW)

- **File:** `packages/server-git/src/tools/diff.ts`
- **Issue:** The `file` parameter was passed after `--` separator (which stops flag parsing) but lacked explicit validation
- **Risk:** Low — the `--` separator already prevents flag interpretation. Added for defense-in-depth
- **Fix:** Added `assertNoFlagInjection(file, "file")` before pushing to args
- **Test:** Added `security: diff tool — file validation` test block

### Informational

#### I1: `go generate` — duplicate validation (INFO)

- **File:** `packages/server-go/src/tools/generate.ts`
- **Issue:** The `patterns` array was validated twice in the handler (duplicate loop)
- **Fix:** Removed the duplicate validation loop
- **Impact:** None — code correctness was unaffected

#### I2: `build` tool — args intentionally unvalidated (INFO)

- **File:** `packages/server-build/src/tools/build.ts`
- **Issue:** The `args` parameter accepts arbitrary flags by design (e.g., `['run', 'build']`)
- **Mitigation:** The `command` parameter is validated against an allowlist (`npm`, `npx`, `pnpm`, `yarn`), limiting the blast radius. The `args` are passed via `execFile` (no shell), preventing command injection.
- **Decision:** Accepted risk — restricting args would break the tool's purpose

## Package-by-Package Results

### New packages (v0.7.0)

| Package             | Flag injection               | Command injection | Input limits | Security tests |
| ------------------- | ---------------------------- | ----------------- | ------------ | -------------- |
| `@paretools/search` | PASS                         | PASS              | PASS         | PASS           |
| `@paretools/github` | PASS                         | PASS              | PASS         | PASS           |
| `@paretools/http`   | PASS (URL scheme validation) | PASS              | PASS         | PASS           |
| `@paretools/make`   | PASS                         | PASS              | PASS         | PASS           |

### Existing packages (updated)

| Package             | Flag injection              | Command injection | Input limits | Security tests |
| ------------------- | --------------------------- | ----------------- | ------------ | -------------- |
| `@paretools/git`    | PASS (F3, F4 fixed)         | PASS              | PASS         | PASS           |
| `@paretools/test`   | PASS (F2 fixed)             | PASS              | PASS         | PASS           |
| `@paretools/npm`    | PASS                        | PASS              | PASS         | PASS           |
| `@paretools/build`  | PASS (I2 accepted)          | PASS              | PASS         | PASS           |
| `@paretools/lint`   | PASS                        | PASS              | PASS         | PASS           |
| `@paretools/python` | PASS                        | PASS              | PASS         | PASS           |
| `@paretools/docker` | PASS                        | PASS              | PASS         | PASS           |
| `@paretools/cargo`  | PASS                        | PASS              | PASS         | PASS           |
| `@paretools/go`     | PASS (F1 fixed, I1 cleaned) | PASS              | PASS         | PASS           |
| `@paretools/shared` | N/A (utility)               | N/A               | N/A          | PASS           |

## Security Architecture

All Pare servers follow these security patterns:

1. **No shell interpolation:** All commands use `execFile()` via the shared `run()` helper, never `exec()` or template strings
2. **Flag injection prevention:** Every user-supplied string passed as a CLI positional argument is validated with `assertNoFlagInjection()`, which rejects values starting with `-` (including after whitespace trimming)
3. **Input size limits:** All Zod schemas use `.max(INPUT_LIMITS.*)` constraints to prevent oversized inputs
4. **URL scheme validation** (http package): Only `http://` and `https://` schemes are allowed
5. **CRLF injection prevention** (http package): Header values are validated against CRLF sequences
6. **Body safety** (http package): Request bodies use `--data-raw` to prevent curl `@file` expansion
7. **Volume mount validation** (docker package): Dangerous host paths are blocked
8. **Error sanitization:** Error messages do not leak absolute file paths or internal state
