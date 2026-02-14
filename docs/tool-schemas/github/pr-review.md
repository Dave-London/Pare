# github > pr-review

Submits a review on a pull request (approve, request-changes, or comment). Returns structured data with the review event and URL.

**Command**: `gh pr review 42 --approve` / `gh pr review 42 --request-changes --body-file -`

## Input Parameters

| Parameter | Type                                              | Default | Description                                            |
| --------- | ------------------------------------------------- | ------- | ------------------------------------------------------ |
| `number`  | number                                            | —       | Pull request number                                    |
| `event`   | `"approve"` \| `"request-changes"` \| `"comment"` | —       | Review type                                            |
| `body`    | string                                            | —       | Review body (required for request-changes and comment) |
| `path`    | string                                            | cwd     | Repository path                                        |

## Success

<table>
<tr><th></th><th>Standard CLI Output</th><th>Pare Response</th></tr>
<tr>
<td><strong>Full</strong></td>
<td>

~20 tokens

```
Approved pull request #42
https://github.com/owner/repo/pull/42
```

</td>
<td>

~15 tokens

```json
{
  "number": 42,
  "event": "approve",
  "url": "https://github.com/owner/repo/pull/42"
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

## Error — Body Required

<table>
<tr><th></th><th>Standard CLI Output</th><th>Pare Response</th></tr>
<tr>
<td><strong>Error</strong></td>
<td><em>n/a (validated client-side)</em></td>
<td>

~15 tokens

```json
{
  "error": "Review body is required for \"request-changes\" reviews."
}
```

</td>
</tr>
</table>

## Token Savings

| Scenario    | CLI Tokens | Pare Full | Pare Compact | Savings |
| ----------- | ---------- | --------- | ------------ | ------- |
| PR approved | ~20        | ~15       | ~15          | 25%     |

## Notes

- The `body` field is required for `request-changes` and `comment` events; omitting it throws an error before calling `gh`
- The body is passed via stdin (`--body-file -`) to avoid shell escaping issues
- No compact mode mapping exists since output is already minimal
