# swift > build

Builds a Swift package and returns structured compiler diagnostics.

**Command**: `swift build`

## Input Parameters

| Parameter       | Type                     | Default | Description                                                |
| --------------- | ------------------------ | ------- | ---------------------------------------------------------- |
| `configuration` | `"debug"` \| `"release"` | —       | Build configuration (debug or release)                     |
| `target`        | string                   | —       | Specific target to build                                   |
| `product`       | string                   | —       | Specific product to build                                  |
| `verbose`       | boolean                  | `false` | Enable verbose output (-v)                                 |
| `path`          | string                   | cwd     | Project root path                                          |
| `compact`       | boolean                  | `true`  | Auto-compact when structured output exceeds raw CLI tokens |

## Success — Clean Build

<table>
<tr><th></th><th>Standard CLI Output</th><th>Pare Response</th></tr>
<tr>
<td><strong>Full</strong></td>
<td>

~80 tokens

```
$ swift build
Building for debugging...
Compiling MyApp main.swift
Compiling MyApp Utils.swift
Linking MyApp
Build complete! (1.42s)
```

</td>
<td>

~30 tokens

```json
{
  "success": true,
  "exitCode": 0,
  "errors": [],
  "warnings": [],
  "duration": 1420,
  "timedOut": false
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

## Success — Build With Warnings

<table>
<tr><th></th><th>Standard CLI Output</th><th>Pare Response</th></tr>
<tr>
<td><strong>Full</strong></td>
<td>

~250 tokens

```
$ swift build
Building for debugging...
Compiling MyApp main.swift
/home/user/MyApp/Sources/main.swift:5:9: warning: initialization of variable 'x' was never used; consider replacing with assignment to '_' or removing it
    let x = 42
        ^
/home/user/MyApp/Sources/main.swift:12:5: warning: result of call to 'process()' is unused
    process()
    ^~~~~~~~~
Build complete! (1.85s)
```

</td>
<td>

~90 tokens

```json
{
  "success": true,
  "exitCode": 0,
  "errors": [],
  "warnings": [
    {
      "file": "Sources/main.swift",
      "line": 5,
      "column": 9,
      "severity": "warning",
      "message": "initialization of variable 'x' was never used; consider replacing with assignment to '_' or removing it"
    },
    {
      "file": "Sources/main.swift",
      "line": 12,
      "column": 5,
      "severity": "warning",
      "message": "result of call to 'process()' is unused"
    }
  ],
  "duration": 1850,
  "timedOut": false
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
  "success": true,
  "exitCode": 0,
  "duration": 1850,
  "timedOut": false
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

~200 tokens

```
$ swift build
Building for debugging...
Compiling MyApp main.swift
/home/user/MyApp/Sources/main.swift:8:20: error: cannot convert value of type 'String' to specified type 'Int'
    let count: Int = "hello"
                     ^~~~~~~
/home/user/MyApp/Sources/main.swift:8:20: note: did you mean to use 'Int(_:)'?
error: fatalError
```

</td>
<td>

~70 tokens

```json
{
  "success": false,
  "exitCode": 1,
  "errors": [
    {
      "file": "Sources/main.swift",
      "line": 8,
      "column": 20,
      "severity": "error",
      "message": "cannot convert value of type 'String' to specified type 'Int'"
    }
  ],
  "warnings": [],
  "duration": 2100,
  "timedOut": false
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
  "success": false,
  "exitCode": 1,
  "duration": 2100,
  "timedOut": false
}
```

</td>
</tr>
</table>

## Token Savings

| Scenario            | CLI Tokens | Pare Full | Pare Compact | Savings |
| ------------------- | ---------- | --------- | ------------ | ------- |
| Clean build         | ~80        | ~30       | ~30          | 63%     |
| Build with warnings | ~250       | ~90       | ~30          | 64-88%  |
| Compilation error   | ~200       | ~70       | ~30          | 65-85%  |

## Notes

- Diagnostics are separated into `errors` and `warnings` arrays, each containing `file`, `line`, `column`, `severity`, and `message`
- The `configuration` parameter maps to `-c debug` or `-c release`
- The `target` and `product` parameters are validated against flag injection
- Compact mode drops `errors` and `warnings` arrays, keeping only `success`, `exitCode`, `duration`, and `timedOut`
- If the build times out, `timedOut` is set to `true` and `exitCode` is `124`
