# github > issue-comment

Adds a comment to an issue. Returns structured data with the comment URL.

**Command**: `gh issue comment 100 --body-file -` (body passed via stdin)

## Input Parameters

| Parameter | Type   | Default | Description     |
| --------- | ------ | ------- | --------------- |
| `number`  | number | —       | Issue number    |
| `body`    | string | —       | Comment text    |
| `path`    | string | cwd     | Repository path |

## Success

<table>
<tr><th></th><th>Standard CLI Output</th><th>Pare Response</th></tr>
<tr>
<td><strong>Full</strong></td>
<td>

~20 tokens

```
https://github.com/owner/repo/issues/100#issuecomment-1234567890
```

</td>
<td>

~10 tokens

```json
{
  "url": "https://github.com/owner/repo/issues/100#issuecomment-1234567890"
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

## Token Savings

| Scenario      | CLI Tokens | Pare Full | Pare Compact | Savings |
| ------------- | ---------- | --------- | ------------ | ------- |
| Comment added | ~20        | ~10       | ~10          | 50%     |

## Notes

- The comment body is passed via stdin (`--body-file -`) to avoid shell escaping issues
- Input validation rejects flag injection in the `body` field
- Uses the same `CommentResult` schema and parser as `pr-comment`
