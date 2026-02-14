# test > coverage

Runs tests with coverage and returns structured coverage summary per file. Auto-detects pytest/jest/vitest/mocha.

**Command**: `python -m pytest --cov --cov-report=term-missing -q` / `npx jest --coverage` / `npx vitest run --coverage` / `npx nyc mocha`

## Input Parameters

| Parameter   | Type                                              | Default     | Description                                                |
| ----------- | ------------------------------------------------- | ----------- | ---------------------------------------------------------- |
| `path`      | string                                            | cwd         | Project root path                                          |
| `framework` | `"pytest"` \| `"jest"` \| `"vitest"` \| `"mocha"` | auto-detect | Force a specific framework                                 |
| `compact`   | boolean                                           | `true`      | Auto-compact when structured output exceeds raw CLI tokens |

## Success — Pytest Coverage

<table>
<tr><th></th><th>Standard CLI Output</th><th>Pare Response</th></tr>
<tr>
<td><strong>Full</strong></td>
<td>

~200 tokens

```
---------- coverage: platform linux, python 3.11.7-final-0 ----------
Name                  Stmts   Miss  Cover
------------------------------------------
src/auth.py              25      2    92%
src/api.py               40      8    80%
src/models.py            30      3    90%
src/utils.py             15      0   100%
------------------------------------------
TOTAL                   110     13    88%
```

</td>
<td>

~100 tokens

```json
{
  "framework": "pytest",
  "summary": {
    "lines": 88
  },
  "files": [
    { "file": "src/auth.py", "lines": 92 },
    { "file": "src/api.py", "lines": 80 },
    { "file": "src/models.py", "lines": 90 },
    { "file": "src/utils.py", "lines": 100 }
  ],
  "totalFiles": 4
}
```

</td>
</tr>
<tr>
<td><strong>Compact</strong></td>
<td><em>n/a</em></td>
<td>

~30 tokens

```json
{
  "framework": "pytest",
  "summary": {
    "lines": 88
  },
  "totalFiles": 4
}
```

</td>
</tr>
</table>

## Success — Jest Coverage (with Branches/Functions)

<table>
<tr><th></th><th>Standard CLI Output</th><th>Pare Response</th></tr>
<tr>
<td><strong>Full</strong></td>
<td>

~250 tokens

```
----------|---------|----------|---------|---------|-------------------
File      | % Stmts | % Branch | % Funcs | % Lines | Uncovered Line #s
----------|---------|----------|---------|---------|-------------------
All files |   85.71 |    66.67 |     100 |   87.50 |
 auth.ts  |     100 |      100 |     100 |     100 |
 api.ts   |   71.43 |    33.33 |     100 |   75.00 | 12-15,28
 utils.ts |   85.71 |    66.67 |     100 |   87.50 | 42
----------|---------|----------|---------|---------|-------------------

Test Suites: 3 passed, 3 total
Tests:       8 passed, 8 total
Time:        1.234s
```

</td>
<td>

~130 tokens

```json
{
  "framework": "jest",
  "summary": {
    "lines": 87.5,
    "branches": 66.67,
    "functions": 100
  },
  "files": [
    { "file": "auth.ts", "lines": 100, "branches": 100, "functions": 100 },
    { "file": "api.ts", "lines": 75, "branches": 33.33, "functions": 100 },
    { "file": "utils.ts", "lines": 87.5, "branches": 66.67, "functions": 100 }
  ],
  "totalFiles": 3
}
```

</td>
</tr>
<tr>
<td><strong>Compact</strong></td>
<td><em>n/a</em></td>
<td>

~35 tokens

```json
{
  "framework": "jest",
  "summary": {
    "lines": 87.5,
    "branches": 66.67,
    "functions": 100
  },
  "totalFiles": 3
}
```

</td>
</tr>
</table>

## Error — No Coverage Tool Configured

<table>
<tr><th></th><th>Standard CLI Output</th><th>Pare Response</th></tr>
<tr>
<td><strong>Error</strong></td>
<td>

~60 tokens

```
ERROR: No module named 'pytest_cov'
HINT: pip install pytest-cov
```

</td>
<td>

~30 tokens

```json
{
  "framework": "pytest",
  "summary": {
    "lines": 0
  },
  "files": [],
  "totalFiles": 0
}
```

</td>
</tr>
</table>

## Token Savings

| Scenario                 | CLI Tokens | Pare Full | Pare Compact | Savings |
| ------------------------ | ---------- | --------- | ------------ | ------- |
| Pytest (4 files)         | ~200       | ~100      | ~30          | 50–85%  |
| Jest (3 files, branches) | ~250       | ~130      | ~35          | 48–86%  |
| Error (no coverage tool) | ~60        | ~30       | ~30          | 50%     |

## Notes

- Compact mode drops per-file details and `uncoveredLines`, keeping only the aggregate summary and file count
- `branches` and `functions` are only available for JavaScript/TypeScript frameworks (jest, vitest, mocha with nyc)
- Pytest requires `pytest-cov` package; mocha requires `nyc` (Istanbul)
