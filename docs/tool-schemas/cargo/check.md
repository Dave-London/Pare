# cargo > check

Runs cargo check (type check without full build) and returns structured diagnostics. Faster than build for error checking.

**Command**: `cargo check --message-format=json`

## Input Parameters

| Parameter | Type    | Default | Description                                                |
| --------- | ------- | ------- | ---------------------------------------------------------- |
| `path`    | string  | cwd     | Project root path                                          |
| `package` | string  | --      | Package to check in a workspace                            |
| `compact` | boolean | `true`  | Auto-compact when structured output exceeds raw CLI tokens |

## Success — Clean Check

<table>
<tr><th></th><th>Standard CLI Output</th><th>Pare Response</th></tr>
<tr>
<td><strong>Full</strong></td>
<td>

~80 tokens

```
    Checking my-app v0.1.0 (/home/user/my-app)
    Finished `dev` profile [unoptimized + debuginfo] target(s) in 0.45s
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

## Error — Type Errors

<table>
<tr><th></th><th>Standard CLI Output</th><th>Pare Response</th></tr>
<tr>
<td><strong>Full</strong></td>
<td>

~350 tokens

```
    Checking my-app v0.1.0 (/home/user/my-app)
error[E0382]: borrow of moved value: `s`
  --> src/main.rs:8:20
   |
6  |     let s = String::from("hello");
   |         - move occurs because `s` has type `String`
7  |     let s2 = s;
   |              - value moved here
8  |     println!("{}", s);
   |                    ^ value borrowed here after move

error[E0308]: mismatched types
  --> src/lib.rs:15:12
   |
15 |     return "not a number";
   |            ^^^^^^^^^^^^^^ expected `i32`, found `&str`

error: aborting due to 2 previous errors
```

</td>
<td>

~100 tokens

```json
{
  "success": false,
  "diagnostics": [
    {
      "file": "src/main.rs",
      "line": 8,
      "column": 20,
      "severity": "error",
      "code": "E0382",
      "message": "borrow of moved value: `s`"
    },
    {
      "file": "src/lib.rs",
      "line": 15,
      "column": 12,
      "severity": "error",
      "code": "E0308",
      "message": "mismatched types"
    }
  ],
  "total": 2,
  "errors": 2,
  "warnings": 0
}
```

</td>
</tr>
<tr>
<td><strong>Compact</strong></td>
<td><em>n/a</em></td>
<td>

~100 tokens

```json
{
  "success": false,
  "diagnostics": [
    {
      "file": "src/main.rs",
      "line": 8,
      "column": 20,
      "severity": "error",
      "code": "E0382",
      "message": "borrow of moved value: `s`"
    },
    {
      "file": "src/lib.rs",
      "line": 15,
      "column": 12,
      "severity": "error",
      "code": "E0308",
      "message": "mismatched types"
    }
  ],
  "errors": 2,
  "warnings": 0,
  "total": 2
}
```

</td>
</tr>
</table>

## Token Savings

| Scenario      | CLI Tokens | Pare Full | Pare Compact | Savings |
| ------------- | ---------- | --------- | ------------ | ------- |
| Clean check   | ~80        | ~30       | ~30          | 63%     |
| 2 type errors | ~350       | ~100      | ~100         | 71%     |

## Notes

- Uses `--message-format=json` to parse compiler messages, identical to the `build` tool
- Shares the same output schema (`CargoBuildResultSchema`) and parser as `build`
- The `package` parameter uses `-p` to check a specific package in a workspace
- Faster than `cargo build` because it skips code generation -- useful for quick error checking
- In compact mode, empty `diagnostics` arrays are omitted; non-empty arrays are preserved along with counts
