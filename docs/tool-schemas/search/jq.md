# search > jq

Processes and transforms JSON using jq expressions. Accepts JSON from a file path or inline string. Returns the transformed result.

**Command**: `jq <expression> [file]`

## Input Parameters

| Parameter    | Type    | Default      | Description                                                      |
| ------------ | ------- | ------------ | ---------------------------------------------------------------- |
| `expression` | string  | _(required)_ | jq filter expression (e.g., `.name`, `.[] \| select(.age > 30)`) |
| `file`       | string  | —            | Path to a JSON file to process                                   |
| `input`      | string  | —            | Inline JSON string to process (used when file is not provided)   |
| `rawOutput`  | boolean | `false`      | Output raw strings without JSON quotes (`-r` flag)               |
| `sortKeys`   | boolean | `false`      | Sort object keys (`-S` flag)                                     |
| `compact`    | boolean | `true`       | Auto-compact when structured output exceeds raw CLI tokens       |

## Success — Expression Matches

<table>
<tr><th></th><th>Standard CLI Output</th><th>Pare Response</th></tr>
<tr>
<td><strong>Full</strong></td>
<td>

~30 tokens

```
$ jq '.dependencies | keys' package.json
[
  "express",
  "lodash",
  "zod"
]
```

</td>
<td>

~20 tokens

```json
{
  "output": "[\n  \"express\",\n  \"lodash\",\n  \"zod\"\n]",
  "exitCode": 0
}
```

</td>
</tr>
<tr>
<td><strong>Compact</strong></td>
<td><em>n/a</em></td>
<td>

Same as full (output is already minimal).

</td>
</tr>
</table>

## Success — Inline JSON Input

<table>
<tr><th></th><th>Standard CLI Output</th><th>Pare Response</th></tr>
<tr>
<td><strong>Full</strong></td>
<td>

~25 tokens

```
$ echo '{"name":"alice","age":30}' | jq '.name'
"alice"
```

</td>
<td>

~15 tokens

```json
{
  "output": "\"alice\"",
  "exitCode": 0
}
```

</td>
</tr>
</table>

## Error — Invalid Expression

<table>
<tr><th></th><th>Standard CLI Output</th><th>Pare Response</th></tr>
<tr>
<td><strong>Error</strong></td>
<td>

~40 tokens

```
$ jq '.foo[' data.json
jq: error: syntax error, unexpected end-of-input,
expecting ']' (Unix shell quoting issues?) at <top-level>, line 1:
.foo[
jq: 1 compile error
```

</td>
<td>

~30 tokens

```json
{
  "output": "",
  "exitCode": 3
}
```

</td>
</tr>
</table>

## Token Savings

| Scenario           | CLI Tokens | Pare Full | Savings |
| ------------------ | ---------- | --------- | ------- |
| Expression matches | ~30        | ~20       | 33%     |
| Inline JSON input  | ~25        | ~15       | 40%     |
| Invalid expression | ~40        | ~30       | 25%     |

## Notes

- Either `file` or `input` must be provided; if neither is specified, the tool returns an error without invoking jq
- When `file` is provided, it is passed as a positional argument to jq; when `input` is provided, it is piped via stdin
- The `file` parameter is validated against flag injection (values starting with `-` are rejected)
- The `rawOutput` flag maps to jq's `-r` option, stripping JSON string quotes from output
- The `sortKeys` flag maps to jq's `-S` option, sorting object keys alphabetically
- Exit code 0 indicates success; jq uses exit codes 2 (usage error) and 3 (compile error) for failures
- The output field contains the raw jq output text, preserving formatting
