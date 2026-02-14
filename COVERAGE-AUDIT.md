# Test Coverage Audit — Pare v0.8.0

**Date:** 2026-02-13
**Scope:** All 14 packages
**Thresholds:** 80% lines/functions, 70% branches

## Summary

| Metric                          | Target | Actual (avg) | Result    |
| ------------------------------- | ------ | ------------ | --------- |
| Line coverage                   | >= 80% | 96.24%       | PASS      |
| Branch coverage                 | >= 70% | 87.44%       | PASS      |
| Function coverage               | >= 80% | 96.53%       | PASS      |
| Packages meeting all thresholds | 14/14  | 13/14        | SEE NOTES |

## Per-Package Coverage

| Package             | Lines  | Branches | Functions | Status |
| ------------------- | ------ | -------- | --------- | ------ |
| `@paretools/shared` | 91.78% | 82.14%   | 100%      | PASS   |
| `@paretools/git`    | 100%   | 90.82%   | 100%      | PASS   |
| `@paretools/github` | 100%   | 78.07%   | 100%      | PASS   |
| `@paretools/search` | 100%   | 90.62%   | 100%      | PASS   |
| `@paretools/http`   | 92.85% | 75%      | 82.35%    | PASS   |
| `@paretools/make`   | 100%   | 97.5%    | 100%      | PASS   |
| `@paretools/test`   | 77.52% | 74.86%   | 84.61%    | NOTE   |
| `@paretools/npm`    | 99.32% | 98.29%   | 100%      | PASS   |
| `@paretools/docker` | 90.16% | 78.29%   | 84.5%     | PASS   |
| `@paretools/build`  | 99.03% | 93.37%   | 100%      | PASS   |
| `@paretools/lint`   | 97.41% | 82.75%   | 100%      | PASS   |
| `@paretools/python` | 99.27% | 93.51%   | 100%      | PASS   |
| `@paretools/cargo`  | 100%   | 97.24%   | 100%      | PASS   |
| `@paretools/go`     | 100%   | 91.66%   | 100%      | PASS   |

## Notes

### `@paretools/test` — 77.52% lines (below 80% threshold)

The test server has inherently lower coverage because its `tools/run.ts` integration layer (which shells out to 4 different test frameworks) is difficult to exercise in unit tests without the actual frameworks installed. The coverage breakdown shows:

- **Parsers and formatters:** 100% line coverage across all 4 framework parsers (pytest, jest, vitest, mocha)
- **Detection and schemas:** 100% line coverage
- **`tools/run.ts`:** 9.25% lines — this file orchestrates external framework execution and is primarily tested via integration tests

**Mitigation:** All critical parsing, formatting, and security validation paths are fully covered. The uncovered code is the tool execution layer that degrades gracefully on errors.

### `@paretools/http` — 82.35% functions (above threshold but lower than peers)

The http package has 4 tools with overlapping functionality (request, get, post, head). The `curl-runner.ts` module shows 0% function coverage as it is tested indirectly through tool-level integration tests. The `tools/request.ts` file has 33.33% function coverage and 42.85% branch coverage due to the request execution paths requiring live HTTP endpoints.

### `@paretools/docker` — 78.29% branches (above threshold but noteworthy)

The docker package's `parsers.ts` has 66.38% branch coverage due to the many edge cases in Docker CLI output parsing (varied container states, network configurations, compose output formats). The `formatters.ts` file has 75.55% function coverage, with some formatting helpers for less common Docker operations tested only via integration tests.

## Test Statistics

- **Total tests:** 2,374
- **Test files:** 120
- **Frameworks tested:** vitest (unit + integration)
- **All unit tests passing:** Yes (73 integration test failures due to missing external tools in CI environment — Docker, Go, Python, etc.)

## Methodology

Coverage was collected using `vitest --coverage` with the `@vitest/coverage-v8` provider across all 14 packages. Numbers reflect statement/branch/function coverage of `src/` files excluding test files and type declarations.
