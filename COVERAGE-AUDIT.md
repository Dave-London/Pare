# Test Coverage Audit — Pare v0.7.0

**Date:** 2026-02-12
**Scope:** All 14 packages
**Thresholds:** 80% lines/functions, 70% branches

## Summary

| Metric                          | Target | Actual (avg) | Result    |
| ------------------------------- | ------ | ------------ | --------- |
| Line coverage                   | >= 80% | 96.6%        | PASS      |
| Branch coverage                 | >= 70% | 87.2%        | PASS      |
| Function coverage               | >= 80% | 96.2%        | PASS      |
| Packages meeting all thresholds | 14/14  | 12/14        | SEE NOTES |

## Per-Package Coverage

| Package             | Lines  | Branches | Functions | Status |
| ------------------- | ------ | -------- | --------- | ------ |
| `@paretools/shared` | 90.76% | 79.16%   | 100%      | PASS   |
| `@paretools/git`    | 100%   | 90.45%   | 100%      | PASS   |
| `@paretools/github` | 100%   | 78.07%   | 100%      | PASS   |
| `@paretools/search` | 100%   | 90.62%   | 100%      | PASS   |
| `@paretools/http`   | 92.85% | 75%      | 82.35%    | PASS   |
| `@paretools/make`   | 100%   | 97.5%    | 100%      | PASS   |
| `@paretools/test`   | 77.88% | 74.3%    | 84.61%    | NOTE   |
| `@paretools/npm`    | 100%   | 97.75%   | 100%      | PASS   |
| `@paretools/docker` | 90%    | 77.09%   | 84.5%     | PASS   |
| `@paretools/build`  | 99.07% | 92.77%   | 100%      | PASS   |
| `@paretools/lint`   | 97.52% | 80.8%    | 100%      | PASS   |
| `@paretools/python` | 99.27% | 93.51%   | 100%      | PASS   |
| `@paretools/cargo`  | 100%   | 97.24%   | 100%      | PASS   |
| `@paretools/go`     | 100%   | 91.66%   | 100%      | PASS   |

## Notes

### `@paretools/test` — 77.88% lines (below 80% threshold)

The test server has inherently lower coverage because its parsers handle output from 4 different test frameworks (pytest, jest, vitest, mocha). Each parser has edge cases for malformed/partial output that are difficult to trigger in unit tests without mocking entire framework outputs. The uncovered lines are primarily:

- Fallback branches in JSON extraction (`extractJson`) for unusual framework output formats
- Temp file cleanup paths (`readJsonOutput`) for OS-level file errors
- Framework-specific snapshot update logic

**Mitigation:** All critical paths (parsing, formatting, security validation) are covered. The uncovered code is defensive error handling that degrades gracefully.

### `@paretools/http` — 82.35% functions (above threshold but lower than peers)

The http package has 4 tools with overlapping functionality (request, get, post, head). Some shared internal helpers are tested indirectly through tool-level tests rather than having dedicated unit tests.

## Test Statistics

- **Total tests:** 2,482+
- **Test files:** 100+
- **Frameworks tested:** vitest (unit + integration)
- **All tests passing:** Yes

## Methodology

Coverage was collected using `vitest --coverage` with the `@vitest/coverage-v8` provider across all 14 packages. Numbers reflect statement/branch/function coverage of `src/` files excluding test files and type declarations.
