# npm > test

Runs `npm test` / `pnpm test` / `yarn test` and returns structured output with exit code, stdout, stderr, and duration. Shorthand for running the test script defined in package.json.

**Command**: `npm test` / `pnpm test` / `yarn test`

## Input Parameters

| Parameter        | Type                             | Default     | Description                                                            |
| ---------------- | -------------------------------- | ----------- | ---------------------------------------------------------------------- |
| `path`           | string                           | cwd         | Project root path                                                      |
| `args`           | string[]                         | `[]`        | Additional arguments passed after `--` to the test script              |
| `packageManager` | `"npm"` \| `"pnpm"` \| `"yarn"` | auto-detect | Package manager to use. Auto-detected from lock files if not specified |
| `filter`         | string                           | —           | pnpm workspace filter pattern (e.g., `@scope/pkg`). Only used with pnpm |

## Success — Tests Pass

<table>
<tr><th></th><th>Standard CLI Output</th><th>Pare Response</th></tr>
<tr>
<td><strong>Full</strong></td>
<td>

~100 tokens

```
> my-app@1.0.0 test
> vitest run

 ✓ src/utils.test.ts (3 tests) 12ms
 ✓ src/api.test.ts (5 tests) 45ms

 Test Files  2 passed (2)
      Tests  8 passed (8)
   Duration  0.85s
```

</td>
<td>

~40 tokens

```json
{
  "packageManager": "npm",
  "exitCode": 0,
  "stdout": "✓ src/utils.test.ts (3 tests) 12ms\n✓ src/api.test.ts (5 tests) 45ms\n\nTest Files  2 passed (2)\n     Tests  8 passed (8)\n  Duration  0.85s",
  "stderr": "",
  "success": true,
  "duration": 1.2
}
```

</td>
</tr>
<tr>
<td><strong>Compact</strong></td>
<td><em>n/a</em></td>
<td>

Same as full (no compact mode for test).

</td>
</tr>
</table>

## Error — Tests Fail

<table>
<tr><th></th><th>Standard CLI Output</th><th>Pare Response</th></tr>
<tr>
<td><strong>Error</strong></td>
<td>

~150 tokens

```
> my-app@1.0.0 test
> vitest run

 ✓ src/utils.test.ts (3 tests) 12ms
 ✗ src/api.test.ts (5 tests) 45ms
   ✗ POST /users should validate email

 Test Files  1 failed | 1 passed (2)
      Tests  1 failed | 7 passed (8)
   Duration  0.92s

npm ERR! Test failed.  See above for more details.
```

</td>
<td>

~55 tokens

```json
{
  "packageManager": "npm",
  "exitCode": 1,
  "stdout": "✓ src/utils.test.ts (3 tests) 12ms\n✗ src/api.test.ts (5 tests) 45ms\n\nTest Files  1 failed | 1 passed (2)\n     Tests  1 failed | 7 passed (8)\n  Duration  0.92s",
  "stderr": "",
  "success": false,
  "duration": 1.5
}
```

</td>
</tr>
</table>

## Token Savings

| Scenario    | CLI Tokens | Pare Full | Savings |
| ----------- | ---------- | --------- | ------- |
| Tests pass  | ~100       | ~40       | 60%     |
| Tests fail  | ~150       | ~55       | 63%     |

## Notes

- This tool runs the `test` script from `package.json`, which may invoke any test framework (vitest, jest, mocha, etc.)
- For structured test results with parsed failures, use the `@paretools/test > run` tool instead, which parses framework-specific output
- The `filter` parameter is only used with pnpm workspaces
- Both stdout and stderr are captured and trimmed before returning
- The `success` field is derived from `exitCode === 0`
