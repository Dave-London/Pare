# cargo > fmt

Checks or fixes Rust formatting and returns structured output with changed files.

**Command**: `cargo fmt` / `cargo fmt --check`

## Input Parameters

| Parameter | Type    | Default | Description                                                |
| --------- | ------- | ------- | ---------------------------------------------------------- |
| `path`    | string  | cwd     | Project root path                                          |
| `check`   | boolean | `false` | Check only without modifying files (--check)               |
| `compact` | boolean | `true`  | Auto-compact when structured output exceeds raw CLI tokens |

## Success — All Formatted

<table>
<tr><th></th><th>Standard CLI Output</th><th>Pare Response</th></tr>
<tr>
<td><strong>Full</strong></td>
<td>

~10 tokens

```
(no output)
```

</td>
<td>

~15 tokens

```json
{
  "success": true,
  "filesChanged": 0,
  "files": []
}
```

</td>
</tr>
<tr>
<td><strong>Compact</strong></td>
<td><em>n/a</em></td>
<td>

~10 tokens

```json
{
  "success": true,
  "filesChanged": 0
}
```

</td>
</tr>
</table>

## Check Mode — Files Need Formatting

<table>
<tr><th></th><th>Standard CLI Output</th><th>Pare Response</th></tr>
<tr>
<td><strong>Full</strong></td>
<td>

~250 tokens

```
Diff in /home/user/my-app/src/main.rs at line 5:
-    let   x=42;
+    let x = 42;

Diff in /home/user/my-app/src/lib.rs at line 12:
-fn foo(a:i32,b:i32)->i32{
+fn foo(a: i32, b: i32) -> i32 {
```

</td>
<td>

~30 tokens

```json
{
  "success": false,
  "filesChanged": 2,
  "files": ["src/main.rs", "src/lib.rs"]
}
```

</td>
</tr>
<tr>
<td><strong>Compact</strong></td>
<td><em>n/a</em></td>
<td>

~10 tokens

```json
{
  "success": false,
  "filesChanged": 2
}
```

</td>
</tr>
</table>

## Token Savings

| Scenario                | CLI Tokens | Pare Full | Pare Compact | Savings |
| ----------------------- | ---------- | --------- | ------------ | ------- |
| All formatted           | ~10        | ~15       | ~10          | 0%      |
| 2 files need formatting | ~250       | ~30       | ~10          | 88-96%  |

## Notes

- Without `--check`, `cargo fmt` reformats files in place and returns an empty file list
- With `--check`, the tool reports files that differ from the expected formatting
- Parses `Diff in <path> at line N:` patterns and `.rs` file paths from output
- Compact mode drops the file list, keeping only the count
- Exit code is non-zero when `--check` finds formatting differences
