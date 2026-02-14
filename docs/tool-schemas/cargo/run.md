# cargo > run

Runs a cargo binary and returns structured output (exit code, stdout, stderr).

**Command**: `cargo run`

## Input Parameters

| Parameter | Type     | Default | Description                                                |
| --------- | -------- | ------- | ---------------------------------------------------------- |
| `path`    | string   | cwd     | Project root path                                          |
| `args`    | string[] | `[]`    | Arguments to pass to the binary (after --)                 |
| `release` | boolean  | `false` | Run in release mode                                        |
| `package` | string   | --      | Package to run in a workspace                              |
| `compact` | boolean  | `true`  | Auto-compact when structured output exceeds raw CLI tokens |

## Success — Normal Execution

<table>
<tr><th></th><th>Standard CLI Output</th><th>Pare Response</th></tr>
<tr>
<td><strong>Full</strong></td>
<td>

~100 tokens

```
   Compiling my-app v0.1.0 (/home/user/my-app)
    Finished `dev` profile [unoptimized + debuginfo] target(s) in 0.98s
     Running `target/debug/my-app`
Hello, world!
Processing 42 items...
Done.
```

</td>
<td>

~40 tokens

```json
{
  "exitCode": 0,
  "stdout": "Hello, world!\nProcessing 42 items...\nDone.",
  "stderr": "",
  "success": true
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
  "exitCode": 0,
  "success": true
}
```

</td>
</tr>
</table>

## Error — Runtime Panic

<table>
<tr><th></th><th>Standard CLI Output</th><th>Pare Response</th></tr>
<tr>
<td><strong>Full</strong></td>
<td>

~200 tokens

```
   Compiling my-app v0.1.0 (/home/user/my-app)
    Finished `dev` profile [unoptimized + debuginfo] target(s) in 0.98s
     Running `target/debug/my-app`
thread 'main' panicked at src/main.rs:5:5:
index out of bounds: the len is 3 but the index is 5
note: run with `RUST_BACKTRACE=1` environment variable to display a backtrace
```

</td>
<td>

~50 tokens

```json
{
  "exitCode": 101,
  "stdout": "",
  "stderr": "thread 'main' panicked at src/main.rs:5:5:\nindex out of bounds: the len is 3 but the index is 5",
  "success": false
}
```

</td>
</tr>
</table>

## Token Savings

| Scenario      | CLI Tokens | Pare Full | Pare Compact | Savings |
| ------------- | ---------- | --------- | ------------ | ------- |
| Normal run    | ~100       | ~40       | ~10          | 60-90%  |
| Runtime panic | ~200       | ~50       | ~10          | 75-95%  |

## Notes

- Arguments after `args` are passed to the binary via `--` separator
- The `package` parameter uses `-p` to select a specific binary in a workspace
- Both `package` and `args` values are validated against flag injection
- Compact mode drops `stdout` and `stderr`, keeping only `exitCode` and `success`
- The `release` flag adds `--release` to run with optimizations
