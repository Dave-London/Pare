# ruby > bundle-check

Verifies that the Gemfile's dependencies are satisfied without installing them.

**Command**: `bundle check`

## Input Parameters

| Parameter | Type    | Default | Description                                                |
| --------- | ------- | ------- | ---------------------------------------------------------- |
| `path`    | string  | cwd     | Working directory                                          |
| `compact` | boolean | `true`  | Auto-compact when structured output exceeds raw CLI tokens |

## Success -- Dependencies Satisfied

<table>
<tr><th></th><th>Standard CLI Output</th><th>Pare Response</th></tr>
<tr>
<td><strong>Full</strong></td>
<td>

~10 tokens

```
$ bundle check
The Gemfile's dependencies are satisfied
```

</td>
<td>

~10 tokens

```json
{
  "satisfied": true,
  "exitCode": 0,
  "message": "The Gemfile's dependencies are satisfied"
}
```

</td>
</tr>
<tr>
<td><strong>Compact</strong></td>
<td><em>n/a</em></td>
<td>

~5 tokens

```json
{
  "satisfied": true,
  "exitCode": 0
}
```

</td>
</tr>
</table>

## Error -- Missing Gems

<table>
<tr><th></th><th>Standard CLI Output</th><th>Pare Response</th></tr>
<tr>
<td><strong>Full</strong></td>
<td>

~30 tokens

```
$ bundle check
The following gems are missing
 * nokogiri (1.16.2)
 * puma (6.4.2)
 * rack (3.0.9)
Install missing gems with `bundle install`
```

</td>
<td>

~25 tokens

```json
{
  "satisfied": false,
  "exitCode": 1,
  "errors": "The following gems are missing\n * nokogiri (1.16.2)\n * puma (6.4.2)\n * rack (3.0.9)\nInstall missing gems with `bundle install`"
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
  "satisfied": false,
  "exitCode": 1,
  "errors": "The following gems are missing\n * nokogiri (1.16.2)\n * puma (6.4.2)\n * rack (3.0.9)\nInstall missing gems with `bundle install`"
}
```

</td>
</tr>
</table>

## Token Savings

| Scenario               | CLI Tokens | Pare Full | Pare Compact | Savings |
| ---------------------- | ---------- | --------- | ------------ | ------- |
| Dependencies satisfied | ~10        | ~10       | ~5           | 0-50%   |
| Missing gems           | ~30        | ~25       | ~20          | 17-33%  |

## Notes

- The `satisfied` boolean provides a clear pass/fail signal for CI pipelines and automation
- On success, the `message` field contains the confirmation text; on failure, the `errors` field lists missing gems
- Compact mode drops the `message` field when satisfied (since `satisfied: true` is sufficient)
- This is a read-only check -- no gems are installed or modified
- Useful as a pre-check before deployment to verify the bundle is complete
