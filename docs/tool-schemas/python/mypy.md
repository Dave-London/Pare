# python > mypy

Runs mypy and returns structured type-check diagnostics with file locations, severity, messages, and error codes.

**Command**: `mypy <targets>`

## Input Parameters

| Parameter | Type     | Default | Description                                                |
| --------- | -------- | ------- | ---------------------------------------------------------- |
| `path`    | string   | cwd     | Project root path                                          |
| `targets` | string[] | `["."]` | Files or directories to check                              |
| `compact` | boolean  | `true`  | Auto-compact when structured output exceeds raw CLI tokens |

## Success -- No Errors

<table>
<tr><th></th><th>Standard CLI Output</th><th>Pare Response</th></tr>
<tr>
<td><strong>Full</strong></td>
<td>

~15 tokens

```
Success: no issues found in 12 source files
```

</td>
<td>

~20 tokens

```json
{
  "success": true,
  "diagnostics": [],
  "total": 0,
  "errors": 0,
  "warnings": 0
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

## Success -- With Errors

<table>
<tr><th></th><th>Standard CLI Output</th><th>Pare Response</th></tr>
<tr>
<td><strong>Full</strong></td>
<td>

~120 tokens

```
src/api/handler.py:42:5: error: Argument 1 to "process" has incompatible type "str"; expected "int"  [arg-type]
src/api/handler.py:58: error: Missing return statement  [return]
src/utils/parser.py:15:9: error: "Dict[str, Any]" has no attribute "items"  [attr-defined]
src/utils/parser.py:30: note: Revealed type is "builtins.str"
Found 3 errors in 2 files (checked 12 source files)
```

</td>
<td>

~100 tokens

```json
{
  "success": false,
  "diagnostics": [
    {
      "file": "src/api/handler.py",
      "line": 42,
      "column": 5,
      "severity": "error",
      "message": "Argument 1 to \"process\" has incompatible type \"str\"; expected \"int\"",
      "code": "arg-type"
    },
    {
      "file": "src/api/handler.py",
      "line": 58,
      "severity": "error",
      "message": "Missing return statement",
      "code": "return"
    },
    {
      "file": "src/utils/parser.py",
      "line": 15,
      "column": 9,
      "severity": "error",
      "message": "\"Dict[str, Any]\" has no attribute \"items\"",
      "code": "attr-defined"
    },
    {
      "file": "src/utils/parser.py",
      "line": 30,
      "severity": "note",
      "message": "Revealed type is \"builtins.str\""
    }
  ],
  "total": 4,
  "errors": 3,
  "warnings": 1
}
```

</td>
</tr>
<tr>
<td><strong>Compact</strong></td>
<td><em>n/a</em></td>
<td>

~20 tokens

```json
{
  "success": false,
  "total": 4,
  "errors": 3,
  "warnings": 1
}
```

</td>
</tr>
</table>

## Token Savings

| Scenario        | CLI Tokens | Pare Full | Pare Compact | Savings |
| --------------- | ---------- | --------- | ------------ | ------- |
| No errors       | ~15        | ~20       | ~20          | 0%      |
| 4 diagnostics   | ~120       | ~100      | ~20          | 17-83%  |

## Notes

- Notes from mypy (e.g., `reveal_type`) are counted as warnings in the summary
- The `column` field is optional and only present when mypy reports a column number
- The `code` field contains the mypy error code (e.g., `arg-type`, `return`, `attr-defined`) when available
- Compact mode drops all individual diagnostics, keeping only `success`, `total`, `errors`, and `warnings` counts
