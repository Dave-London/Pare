# deno > lint

Runs `deno lint` and returns structured diagnostics with file, line, column, code, and message.

**Command**: `deno lint --json`

## Input Parameters

| Parameter | Type     | Default | Description                                                |
| --------- | -------- | ------- | ---------------------------------------------------------- |
| `files`   | string[] | —       | Files or directories to lint (default: current directory)  |
| `path`    | string   | cwd     | Project root path                                          |
| `rules`   | string[] | —       | Include specific lint rules (--rules-include)              |
| `exclude` | string[] | —       | Exclude specific lint rules (--rules-exclude)              |
| `compact` | boolean  | `true`  | Auto-compact when structured output exceeds raw CLI tokens |

## Success — No Lint Errors

<table>
<tr><th></th><th>Standard CLI Output</th><th>Pare Response</th></tr>
<tr>
<td><strong>Full</strong></td>
<td>

~15 tokens

```
$ deno lint
Checked 8 files
```

</td>
<td>

~15 tokens

```json
{
  "success": true,
  "total": 0,
  "errors": 0
}
```

</td>
</tr>
<tr>
<td><strong>Compact</strong></td>
<td><em>n/a</em></td>
<td>

Same as full (no reduction when there are no diagnostics).

</td>
</tr>
</table>

## Error — Lint Errors Found

<table>
<tr><th></th><th>Standard CLI Output</th><th>Pare Response</th></tr>
<tr>
<td><strong>Full</strong></td>
<td>

~200 tokens

```
$ deno lint
(no-unused-vars) `x` is never used
  at src/main.ts:5:7

(no-explicit-any) Unexpected any. Specify a different type.
  at src/utils.ts:12:18
    hint: Use `unknown` type instead

Found 2 problems
Checked 8 files
```

</td>
<td>

~80 tokens

```json
{
  "success": false,
  "total": 2,
  "errors": 2,
  "diagnostics": [
    {
      "file": "src/main.ts",
      "line": 5,
      "column": 7,
      "code": "no-unused-vars",
      "message": "`x` is never used"
    },
    {
      "file": "src/utils.ts",
      "line": 12,
      "column": 18,
      "code": "no-explicit-any",
      "message": "Unexpected any. Specify a different type.",
      "hint": "Use `unknown` type instead"
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

~15 tokens

```json
{
  "success": false,
  "total": 2,
  "errors": 2
}
```

</td>
</tr>
</table>

## Token Savings

| Scenario       | CLI Tokens | Pare Full | Pare Compact | Savings |
| -------------- | ---------- | --------- | ------------ | ------- |
| No lint errors | ~15        | ~15       | ~15          | 0%      |
| 2 lint errors  | ~200       | ~80       | ~15          | 60-93%  |

## Notes

- Uses `--json` flag internally for reliable structured parsing of lint output
- Falls back to text parsing if JSON output is unavailable
- Each diagnostic includes `file`, `line`, `column` (optional), `code` (optional), `message`, and `hint` (optional)
- The `rules` parameter maps to `--rules-include` for enabling specific lint rules
- The `exclude` parameter maps to `--rules-exclude` for disabling specific lint rules
- Compact mode drops the `diagnostics` array, keeping only `success`, `total`, and `errors`
