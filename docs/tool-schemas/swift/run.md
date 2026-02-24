# swift > run

Runs a Swift executable and returns structured output (exit code, stdout, stderr).

**Command**: `swift run [executable] [-- args...]`

## Input Parameters

| Parameter    | Type     | Default | Description                                                |
| ------------ | -------- | ------- | ---------------------------------------------------------- |
| `executable` | string   | —       | Name of the executable product to run                      |
| `args`       | string[] | —       | Arguments to pass to the executable                        |
| `path`       | string   | cwd     | Project root path                                          |
| `compact`    | boolean  | `true`  | Auto-compact when structured output exceeds raw CLI tokens |

## Success — Executable Runs

<table>
<tr><th></th><th>Standard CLI Output</th><th>Pare Response</th></tr>
<tr>
<td><strong>Full</strong></td>
<td>

~50 tokens

```
$ swift run MyApp
Building for debugging...
Build complete! (0.85s)
Hello, World!
Processed 42 items.
```

</td>
<td>

~45 tokens

```json
{
  "success": true,
  "exitCode": 0,
  "stdout": "Hello, World!\nProcessed 42 items.",
  "stderr": "",
  "duration": 850,
  "timedOut": false
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
  "success": true,
  "exitCode": 0,
  "duration": 850,
  "timedOut": false
}
```

</td>
</tr>
</table>

## Error — Runtime Failure

<table>
<tr><th></th><th>Standard CLI Output</th><th>Pare Response</th></tr>
<tr>
<td><strong>Full</strong></td>
<td>

~100 tokens

```
$ swift run MyApp
Building for debugging...
Build complete! (0.92s)
Fatal error: Index out of range
Current stack trace:
0    libswiftCore.dylib  0x00007fff _assertionFailure
1    MyApp               0x0000010a main.swift:15
```

</td>
<td>

~60 tokens

```json
{
  "success": false,
  "exitCode": 134,
  "stdout": "",
  "stderr": "Fatal error: Index out of range\nCurrent stack trace:\n0    libswiftCore.dylib  0x00007fff _assertionFailure\n1    MyApp               0x0000010a main.swift:15",
  "duration": 920,
  "timedOut": false
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
  "exitCode": 134,
  "duration": 920,
  "timedOut": false
}
```

</td>
</tr>
</table>

## Token Savings

| Scenario        | CLI Tokens | Pare Full | Pare Compact | Savings |
| --------------- | ---------- | --------- | ------------ | ------- |
| Runs OK         | ~50        | ~45       | ~20          | 10-60%  |
| Runtime failure | ~100       | ~60       | ~20          | 40-80%  |

## Notes

- If `executable` is omitted, Swift runs the default executable product from the package
- Arguments after `--` are passed directly to the executable, not to the Swift build system
- The `executable` parameter is validated against flag injection
- Unlike other Swift tool outputs, `stdout` and `stderr` are always present (not optional) in the schema
- Compact mode drops `stdout` and `stderr`, keeping only `success`, `exitCode`, `duration`, and `timedOut`
- If the run times out, `timedOut` is set to `true` and `exitCode` is `124`
