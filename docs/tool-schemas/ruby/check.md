# ruby > check

Checks a Ruby file for syntax errors using `ruby -c` and returns structured validation results.

**Command**: `ruby -c <file>`

## Input Parameters

| Parameter | Type    | Default | Description                                                |
| --------- | ------- | ------- | ---------------------------------------------------------- |
| `file`    | string  | --      | Path to the Ruby file to syntax-check                      |
| `path`    | string  | cwd     | Working directory                                          |
| `compact` | boolean | `true`  | Auto-compact when structured output exceeds raw CLI tokens |

## Success -- Valid Syntax

<table>
<tr><th></th><th>Standard CLI Output</th><th>Pare Response</th></tr>
<tr>
<td><strong>Full</strong></td>
<td>

~8 tokens

```
$ ruby -c app.rb
Syntax OK
```

</td>
<td>

~15 tokens

```json
{
  "file": "app.rb",
  "valid": true,
  "exitCode": 0,
  "message": "Syntax OK"
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
  "file": "app.rb",
  "valid": true,
  "exitCode": 0
}
```

</td>
</tr>
</table>

## Error -- Syntax Error

<table>
<tr><th></th><th>Standard CLI Output</th><th>Pare Response</th></tr>
<tr>
<td><strong>Full</strong></td>
<td>

~30 tokens

```
$ ruby -c broken.rb
broken.rb:15: syntax error, unexpected end-of-input, expecting `end'
```

</td>
<td>

~20 tokens

```json
{
  "file": "broken.rb",
  "valid": false,
  "exitCode": 1,
  "errors": "broken.rb:15: syntax error, unexpected end-of-input, expecting `end'"
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
  "file": "broken.rb",
  "valid": false,
  "exitCode": 1,
  "errors": "broken.rb:15: syntax error, unexpected end-of-input, expecting `end'"
}
```

</td>
</tr>
</table>

## Token Savings

| Scenario     | CLI Tokens | Pare Full | Pare Compact | Savings |
| ------------ | ---------- | --------- | ------------ | ------- |
| Valid syntax | ~8         | ~15       | ~10          | 0%      |
| Syntax error | ~30        | ~20       | ~20          | 33%     |

## Notes

- The `valid` boolean provides a clear pass/fail signal for automation
- On success, the `message` field contains "Syntax OK"; on failure, the `errors` field contains the compiler error message
- Compact mode drops the `message` field on success (since `valid: true` is sufficient)
- This is a static check only -- runtime errors are not detected
