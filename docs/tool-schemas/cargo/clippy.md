# cargo > clippy

Runs cargo clippy and returns structured lint diagnostics (file, line, code, severity, message).

**Command**: `cargo clippy --message-format=json`

## Input Parameters

| Parameter | Type    | Default | Description                                                |
| --------- | ------- | ------- | ---------------------------------------------------------- |
| `path`    | string  | cwd     | Project root path                                          |
| `compact` | boolean | `true`  | Auto-compact when structured output exceeds raw CLI tokens |

## Success — No Warnings

<table>
<tr><th></th><th>Standard CLI Output</th><th>Pare Response</th></tr>
<tr>
<td><strong>Full</strong></td>
<td>

~80 tokens

```
    Checking my-app v0.1.0 (/home/user/my-app)
    Finished `dev` profile [unoptimized + debuginfo] target(s) in 0.85s
```

</td>
<td>

~20 tokens

```json
{
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

## Success — With Lint Warnings

<table>
<tr><th></th><th>Standard CLI Output</th><th>Pare Response</th></tr>
<tr>
<td><strong>Full</strong></td>
<td>

~400 tokens

```
    Checking my-app v0.1.0 (/home/user/my-app)
warning: redundant clone
  --> src/main.rs:12:14
   |
12 |     let s = name.clone();
   |                  ^^^^^^^^ help: remove this
   |
   = note: `#[warn(clippy::redundant_clone)]` on by default

warning: this expression creates a reference which is immediately dereferenced by the compiler
  --> src/lib.rs:8:10
   |
8  |     foo(&vec);
   |         ^^^^ help: change this to: `vec`
   |
   = note: `#[warn(clippy::needless_borrow)]` on by default

warning: `my-app` (bin "my-app") generated 2 warnings
    Finished `dev` profile [unoptimized + debuginfo] target(s) in 0.85s
```

</td>
<td>

~100 tokens

```json
{
  "diagnostics": [
    {
      "file": "src/main.rs",
      "line": 12,
      "column": 14,
      "severity": "warning",
      "code": "clippy::redundant_clone",
      "message": "redundant clone"
    },
    {
      "file": "src/lib.rs",
      "line": 8,
      "column": 10,
      "severity": "warning",
      "code": "clippy::needless_borrow",
      "message": "this expression creates a reference which is immediately dereferenced by the compiler"
    }
  ],
  "total": 2,
  "errors": 0,
  "warnings": 2
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
  "diagnostics": [],
  "errors": 0,
  "warnings": 2,
  "total": 2
}
```

</td>
</tr>
</table>

## Token Savings

| Scenario          | CLI Tokens | Pare Full | Pare Compact | Savings |
| ----------------- | ---------- | --------- | ------------ | ------- |
| No warnings       | ~80        | ~20       | ~20          | 75%     |
| 2 lint warnings   | ~400       | ~100      | ~20          | 75-95%  |

## Notes

- Uses `--message-format=json` to parse clippy diagnostics as structured JSON lines
- Shares the same diagnostic parsing logic as the `build` and `check` tools
- The `code` field contains the full clippy lint name (e.g., `clippy::redundant_clone`)
- Compact mode drops all individual diagnostic details, keeping only error/warning counts
- Does not include a `success` field -- use error/warning counts to determine status
