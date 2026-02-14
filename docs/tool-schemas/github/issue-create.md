# github > issue-create

Creates a new issue. Returns structured data with issue number and URL.

**Command**: `gh issue create --title "Bug: login fails" --body "Description" --label bug --label priority:high`

## Input Parameters

| Parameter | Type     | Default | Description     |
| --------- | -------- | ------- | --------------- |
| `title`   | string   | —       | Issue title     |
| `body`    | string   | —       | Issue body      |
| `labels`  | string[] | —       | Labels to apply |
| `path`    | string   | cwd     | Repository path |

## Success

<table>
<tr><th></th><th>Standard CLI Output</th><th>Pare Response</th></tr>
<tr>
<td><strong>Full</strong></td>
<td>

~25 tokens

```
Creating issue in owner/repo

https://github.com/owner/repo/issues/101
```

</td>
<td>

~15 tokens

```json
{
  "number": 101,
  "url": "https://github.com/owner/repo/issues/101"
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
| Issue created | ~25        | ~15       | ~15          | 40%     |

## Notes

- The issue number is extracted from the URL returned by `gh issue create`
- Labels are passed as individual `--label` flags
- Input validation rejects flag injection in `title` and `labels` values
