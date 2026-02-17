# Smoke Test Scenarios: github.pr-checks

## Tool: `@paretools/github` → `pr-checks`

## Implementation: `packages/server-github/src/tools/pr-checks.ts`

## Parser: `parsePrChecks`

## Schema: `PrChecksResultSchema`

## Input params

| Param      | Type    | Required | Notes                           |
| ---------- | ------- | -------- | ------------------------------- |
| `number`   | string  | yes      | PR number, URL, or branch name  |
| `repo`     | string  | no       | OWNER/REPO format               |
| `watch`    | boolean | no       | Poll checks until they complete |
| `required` | boolean | no       | Filter to required checks only  |
| `compact`  | boolean | no       | Default: true                   |

## Scenarios

### Happy path / core functionality

| #   | Scenario                | Params              | Expected Output                                                             | Priority | Status   |
| --- | ----------------------- | ------------------- | --------------------------------------------------------------------------- | -------- | -------- |
| 1   | All checks passing      | `{ number: "123" }` | `checks` array with all `bucket: "pass"`, `summary.passed == summary.total` | P0       | recorded |
| 2   | Mixed pass/fail/pending | `{ number: "123" }` | `checks` with various buckets, `summary` counts match                       | P0       | recorded |
| 3   | All checks pending      | `{ number: "123" }` | All `bucket: "pending"`, `summary.pending == summary.total`                 | P0       | recorded |
| 4   | Single check only       | `{ number: "123" }` | `checks.length == 1`, `summary.total == 1`                                  | P1       | recorded |
| 5   | Many checks (10+)       | `{ number: "123" }` | All checks parsed, summary computed correctly                               | P1       | recorded |

### Empty / no checks — THE BUG (#529)

| #   | Scenario                        | Params              | Expected Output                                                | Priority | Status   |
| --- | ------------------------------- | ------------------- | -------------------------------------------------------------- | -------- | -------- |
| 6   | PR with no CI checks configured | `{ number: "123" }` | `{ checks: [], summary: { total: 0, ... } }` — NOT a Zod crash | P0       | recorded |
| 7   | Empty JSON array from gh        | `{ number: "123" }` | Same as #6                                                     | P0       | recorded |
| 8   | Empty string stdout             | `{ number: "123" }` | Graceful error or empty result                                 | P0       | recorded |

### Exit code handling

| #   | Scenario                        | Params                                    | Expected Output                                     | Priority | Status   |
| --- | ------------------------------- | ----------------------------------------- | --------------------------------------------------- | -------- | -------- |
| 9   | Exit code 0 (all complete)      | `{ number: "123" }`                       | Normal response, no errorType                       | P0       | recorded |
| 10  | Exit code 8 (checks pending)    | `{ number: "123" }`                       | Valid response with pending checks, no error thrown | P0       | recorded |
| 11  | Exit code 1 (PR not found)      | `{ number: "999999" }`                    | `errorType: "not-found"`, `errorMessage` populated  | P0       | recorded |
| 12  | Exit code 1 (permission denied) | `{ number: "123", repo: "private/repo" }` | `errorType: "permission-denied"`                    | P1       | recorded |

### Check deduplication

| #   | Scenario                               | Params              | Expected Output                    | Priority | Status   |
| --- | -------------------------------------- | ------------------- | ---------------------------------- | -------- | -------- |
| 13  | Duplicate check names (re-runs)        | `{ number: "123" }` | Only most recent run kept per name | P1       | recorded |
| 14  | Duplicate names, different completedAt | `{ number: "123" }` | Later completedAt wins             | P1       | recorded |

### Optional params

| #   | Scenario                | Params                                        | Expected Output                                          | Priority | Status   |
| --- | ----------------------- | --------------------------------------------- | -------------------------------------------------------- | -------- | -------- |
| 15  | required: true          | `{ number: "123", required: true }`           | `--required` flag in args, only required checks returned | P1       | recorded |
| 16  | compact: false          | `{ number: "123", compact: false }`           | Full schema output, not compact                          | P1       | recorded |
| 17  | compact: true (default) | `{ number: "123" }`                           | Compact output                                           | P1       | recorded |
| 18  | repo: "owner/repo"      | `{ number: "123", repo: "Dave-London/Pare" }` | `--repo` flag in args                                    | P1       | recorded |

### Security

| #   | Scenario                   | Params                                   | Expected Output                | Priority | Status   |
| --- | -------------------------- | ---------------------------------------- | ------------------------------ | -------- | -------- |
| 19  | repo with flag injection   | `{ number: "123", repo: "--exec=evil" }` | `assertNoFlagInjection` throws | P0       | recorded |
| 20  | number with flag injection | `{ number: "--exec=evil" }`              | `assertNoFlagInjection` throws | P0       | recorded |

### Check fields / data fidelity

| #   | Scenario                                             | Params              | Expected Output                                                                                | Priority | Status   |
| --- | ---------------------------------------------------- | ------------------- | ---------------------------------------------------------------------------------------------- | -------- | -------- |
| 21  | All check fields populated                           | `{ number: "123" }` | Each check has name, state, bucket, description, event, workflow, link, startedAt, completedAt | P1       | recorded |
| 22  | Check with empty/null fields                         | `{ number: "123" }` | Defaults to empty strings, no crash                                                            | P1       | recorded |
| 23  | Bucket values: pass, fail, pending, skipping, cancel | `{ number: "123" }` | Summary counts map correctly to bucket values                                                  | P1       | recorded |

### Compact output

| #   | Scenario                    | Params                             | Expected Output                        | Priority | Status   |
| --- | --------------------------- | ---------------------------------- | -------------------------------------- | -------- | -------- |
| 24  | Compact output with checks  | `{ number: "123", compact: true }` | `compactPrChecksMap` applied correctly | P2       | recorded |
| 25  | Compact output empty checks | `{ number: "123", compact: true }` | Compact output doesn't crash on empty  | P0       | recorded |

### Schema validation

| #   | Scenario                                                     | Params | Expected Output    | Priority | Status   |
| --- | ------------------------------------------------------------ | ------ | ------------------ | -------- | -------- |
| 26  | Every scenario output validates against PrChecksResultSchema | all    | Zod parse succeeds | P0       | recorded |

### Edge cases

| #   | Scenario                    | Params                                                 | Expected Output                                                    | Priority | Status   |
| --- | --------------------------- | ------------------------------------------------------ | ------------------------------------------------------------------ | -------- | -------- |
| 27  | PR number as URL string     | `{ number: "https://github.com/owner/repo/pull/123" }` | Passes URL to gh CLI correctly                                     | P2       | recorded |
| 28  | PR number as branch name    | `{ number: "feature-branch" }`                         | Passes branch to gh CLI correctly                                  | P2       | recorded |
| 29  | watch: true (short timeout) | `{ number: "123", watch: true }`                       | `--watch` flag in args (actual watch behavior not tested in smoke) | P2       | recorded |

## Summary

| Priority  | Count  | Mocked | Recorded | Complete |
| --------- | ------ | ------ | -------- | -------- |
| P0        | 12     | 12     | 12       | 0        |
| P1        | 12     | 12     | 12       | 0        |
| P2        | 5      | 5      | 5        | 0        |
| **Total** | **29** | **29** | **29**   | **0**    |
