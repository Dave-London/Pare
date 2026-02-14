# cargo > build

Runs cargo build and returns structured diagnostics (file, line, code, severity, message).

**Command**: `cargo build --message-format=json`

## Input Parameters

| Parameter | Type    | Default | Description                                                |
| --------- | ------- | ------- | ---------------------------------------------------------- |
| `path`    | string  | cwd     | Project root path                                          |
| `release` | boolean | `false` | Build in release mode                                      |
| `compact` | boolean | `true`  | Auto-compact when structured output exceeds raw CLI tokens |

## Success — Clean Build

<table>
<tr><th></th><th>Standard CLI Output</th><th>Pare Response</th></tr>
<tr>
<td><strong>Full</strong></td>
<td>

~120 tokens

```
   Compiling my-app v0.1.0 (/home/user/my-app)
    Finished `dev` profile [unoptimized + debuginfo] target(s) in 2.34s
```

</td>
<td>

~30 tokens

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

## Success — With Warnings

<table>
<tr><th></th><th>Standard CLI Output</th><th>Pare Response</th></tr>
<tr>
<td><strong>Full</strong></td>
<td>

~350 tokens

```
   Compiling my-app v0.1.0 (/home/user/my-app)
warning: unused variable: `x`
 --> src/main.rs:5:9
  |
5 |     let x = 42;
  |         ^ help: if this is intentional, prefix it with an underscore: `_x`
  |
  = note: `#[warn(unused_variables)]` on by default

warning: unused import: `std::io`
 --> src/main.rs:2:5
  |
2 | use std::io;
  |     ^^^^^^^
  |
  = note: `#[warn(unused_imports)]` on by default

warning: `my-app` (bin "my-app") generated 2 warnings
    Finished `dev` profile [unoptimized + debuginfo] target(s) in 1.12s
```

</td>
<td>

~100 tokens

```json
{
  "success": true,
  "diagnostics": [
    {
      "file": "src/main.rs",
      "line": 5,
      "column": 9,
      "severity": "warning",
      "code": "unused_variables",
      "message": "unused variable: `x`"
    },
    {
      "file": "src/main.rs",
      "line": 2,
      "column": 5,
      "severity": "warning",
      "code": "unused_imports",
      "message": "unused import: `std::io`"
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

~25 tokens

```json
{
  "success": true,
  "diagnostics": [],
  "errors": 0,
  "warnings": 2,
  "total": 2
}
```

</td>
</tr>
</table>

## Error — Compilation Failure

<table>
<tr><th></th><th>Standard CLI Output</th><th>Pare Response</th></tr>
<tr>
<td><strong>Full</strong></td>
<td>

~250 tokens

```
   Compiling my-app v0.1.0 (/home/user/my-app)
error[E0308]: mismatched types
 --> src/main.rs:10:20
   |
10 |     let x: i32 = "hello";
   |            ---   ^^^^^^^ expected `i32`, found `&str`
   |            |
   |            expected due to this

error: aborting due to 1 previous error
```

</td>
<td>

~65 tokens

```json
{
  "success": false,
  "diagnostics": [
    {
      "file": "src/main.rs",
      "line": 10,
      "column": 20,
      "severity": "error",
      "code": "E0308",
      "message": "mismatched types"
    }
  ],
  "total": 1,
  "errors": 1,
  "warnings": 0
}
```

</td>
</tr>
</table>

## Token Savings

| Scenario              | CLI Tokens | Pare Full | Pare Compact | Savings |
| --------------------- | ---------- | --------- | ------------ | ------- |
| Clean build           | ~120       | ~30       | ~30          | 75%     |
| Build with 2 warnings | ~350       | ~100      | ~25          | 71-93%  |
| Compilation error     | ~250       | ~65       | ~25          | 74-90%  |

## Notes

- Uses `--message-format=json` to parse compiler messages as structured JSON lines
- The `release` flag adds `--release` to build with optimizations
- Shares the same output schema (`CargoBuildResultSchema`) as the `check` tool
- Compact mode drops individual diagnostic details, keeping only success status and counts
- The `code` field on diagnostics contains the Rust error code (e.g., `E0308`) or clippy lint name
