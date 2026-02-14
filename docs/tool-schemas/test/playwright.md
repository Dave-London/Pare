# test > playwright

Runs Playwright E2E browser tests with JSON reporter and returns structured results with pass/fail status, duration, and error messages.

**Command**: `npx playwright test --reporter=json [filter] [--project=PROJECT] [--headed]`

## Input Parameters

| Parameter         | Type     | Default | Description                                                |
| ----------------- | -------- | ------- | ---------------------------------------------------------- |
| `path`            | string   | cwd     | Project root path                                          |
| `filter`          | string   | —       | Test filter pattern (file path or test name grep)          |
| `project`         | string   | —       | Playwright project name (`chromium`, `firefox`, `webkit`)  |
| `headed`          | boolean  | `false` | Run tests in headed browser mode                           |
| `updateSnapshots` | boolean  | `false` | Update snapshots                                           |
| `args`            | string[] | `[]`    | Additional arguments to pass to Playwright                 |
| `compact`         | boolean  | `true`  | Auto-compact when structured output exceeds raw CLI tokens |

## Success — All Passing

<table>
<tr><th></th><th>Standard CLI Output</th><th>Pare Response</th></tr>
<tr>
<td><strong>Full</strong></td>
<td>

~200 tokens

```
Running 4 tests using 2 workers

  ✓ auth.spec.ts:5:3 › should login with valid credentials (1.2s)
  ✓ auth.spec.ts:15:3 › should show login error (0.8s)
  ✓ dashboard.spec.ts:5:3 › should load widgets (2.1s)
  - dashboard.spec.ts:20:3 › should export data (skipped)

  4 passed, 1 skipped (12.50s)
```

</td>
<td>

~120 tokens

```json
{
  "summary": {
    "total": 5,
    "passed": 4,
    "failed": 0,
    "skipped": 1,
    "timedOut": 0,
    "interrupted": 0,
    "duration": 12.5
  },
  "suites": [
    {
      "title": "auth.spec.ts",
      "file": "tests/auth.spec.ts",
      "tests": [
        { "title": "should login with valid credentials", "status": "passed", "duration": 1200 },
        { "title": "should show login error", "status": "passed", "duration": 800 }
      ]
    },
    {
      "title": "dashboard.spec.ts",
      "file": "tests/dashboard.spec.ts",
      "tests": [
        { "title": "should load widgets", "status": "passed", "duration": 2100 },
        { "title": "should export data", "status": "skipped", "duration": 0 }
      ]
    }
  ],
  "failures": []
}
```

</td>
</tr>
<tr>
<td><strong>Compact</strong></td>
<td><em>n/a</em></td>
<td>

~40 tokens

```json
{
  "summary": {
    "total": 5,
    "passed": 4,
    "failed": 0,
    "skipped": 1,
    "timedOut": 0,
    "interrupted": 0,
    "duration": 12.5
  },
  "failures": []
}
```

</td>
</tr>
</table>

## Success — With Failures and Timeouts

<table>
<tr><th></th><th>Standard CLI Output</th><th>Pare Response</th></tr>
<tr>
<td><strong>Full</strong></td>
<td>

~500 tokens

```
Running 6 tests using 3 workers

  ✓ auth.spec.ts:5:3 › should login with valid credentials (1.2s)
  ✗ auth.spec.ts:15:3 › should show error for invalid password (3.5s)
  ✓ auth.spec.ts:25:3 › should logout (0.5s)
  ✓ dashboard.spec.ts:5:3 › should load widgets (2.1s)
  ✗ dashboard.spec.ts:20:3 › should handle slow network (30.0s)
  - dashboard.spec.ts:30:3 › should export data (skipped)

  1) auth.spec.ts:15:3 › should show error for invalid password

    Error: expect(locator).toBeVisible()

    Locator: locator('.error-message')
    Expected: visible
    Received: <element(s) not found>

      14 |   await page.fill('#password', 'wrong');
      15 |   await page.click('#submit');
    > 16 |   await expect(page.locator('.error-message')).toBeVisible();
         |                                                ^
      17 | });

        at tests/auth.spec.ts:16:48

  2) dashboard.spec.ts:20:3 › should handle slow network

    Test timeout of 30000ms exceeded.

  2 failed, 3 passed, 1 skipped (36.10s)
```

</td>
<td>

~250 tokens

```json
{
  "summary": {
    "total": 6,
    "passed": 3,
    "failed": 1,
    "skipped": 1,
    "timedOut": 1,
    "interrupted": 0,
    "duration": 36.1
  },
  "suites": [
    {
      "title": "auth.spec.ts",
      "file": "tests/auth.spec.ts",
      "tests": [
        { "title": "should login with valid credentials", "status": "passed", "duration": 1200 },
        {
          "title": "should show error for invalid password",
          "status": "failed",
          "duration": 3500,
          "error": "Expected element to be visible"
        },
        { "title": "should logout", "status": "passed", "duration": 500 }
      ]
    },
    {
      "title": "dashboard.spec.ts",
      "file": "tests/dashboard.spec.ts",
      "tests": [
        { "title": "should load widgets", "status": "passed", "duration": 2100 },
        {
          "title": "should handle slow network",
          "status": "timedOut",
          "duration": 30000,
          "error": "Test timeout of 30000ms exceeded"
        },
        { "title": "should export data", "status": "skipped", "duration": 0 }
      ]
    }
  ],
  "failures": [
    {
      "title": "should show error for invalid password",
      "file": "tests/auth.spec.ts",
      "line": 15,
      "error": "Expected element to be visible"
    },
    {
      "title": "should handle slow network",
      "file": "tests/dashboard.spec.ts",
      "line": 20,
      "error": "Test timeout of 30000ms exceeded"
    }
  ]
}
```

</td>
</tr>
<tr>
<td><strong>Compact</strong></td>
<td><em>n/a</em></td>
<td>

~80 tokens

```json
{
  "summary": {
    "total": 6,
    "passed": 3,
    "failed": 1,
    "skipped": 1,
    "timedOut": 1,
    "interrupted": 0,
    "duration": 36.1
  },
  "failures": [
    {
      "title": "should show error for invalid password",
      "error": "Expected element to be visible"
    },
    {
      "title": "should handle slow network",
      "error": "Test timeout of 30000ms exceeded"
    }
  ]
}
```

</td>
</tr>
</table>

## Error — Playwright Not Installed

<table>
<tr><th></th><th>Standard CLI Output</th><th>Pare Response</th></tr>
<tr>
<td><strong>Error</strong></td>
<td>

~50 tokens

```
Error: Cannot find module '@playwright/test'
```

</td>
<td>

~40 tokens

```json
{
  "summary": {
    "total": 0,
    "passed": 0,
    "failed": 0,
    "skipped": 0,
    "timedOut": 0,
    "interrupted": 0,
    "duration": 0
  },
  "suites": [],
  "failures": []
}
```

</td>
</tr>
</table>

## Token Savings

| Scenario                 | CLI Tokens | Pare Full | Pare Compact | Savings |
| ------------------------ | ---------- | --------- | ------------ | ------- |
| 5 tests passing          | ~200       | ~120      | ~40          | 40–80%  |
| 6 tests, 2 failures      | ~500       | ~250      | ~80          | 50–84%  |
| Playwright not installed | ~50        | ~40       | ~40          | 20%     |

## Notes

- Playwright's JSON reporter outputs nested suites with specs and test results arrays
- When a test has retries, Pare uses the **last retry result** (the final attempt)
- The summary tracks 6 status types: `passed`, `failed`, `timedOut`, `skipped`, `interrupted`
- On Windows, JSON is written to a temp file via `PLAYWRIGHT_JSON_OUTPUT_NAME` env var to avoid stdout encoding issues
- Compact mode drops the `suites` array entirely, keeping only `summary` and `failures` (with just `title` and `error`)
- The `failures` array in full mode includes `file` and `line`; compact mode drops these
