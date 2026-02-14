# github > issue-update

Updates issue metadata (title, body, labels, assignees). Returns structured data with issue number and URL.

**Command**: `gh issue edit 100 --title "new title" --add-label bug --add-assignee alice`

## Input Parameters

| Parameter         | Type     | Default | Description         |
| ----------------- | -------- | ------- | ------------------- |
| `number`          | number   | —       | Issue number        |
| `title`           | string   | —       | New issue title     |
| `body`            | string   | —       | New issue body      |
| `addLabels`       | string[] | —       | Labels to add       |
| `removeLabels`    | string[] | —       | Labels to remove    |
| `addAssignees`    | string[] | —       | Assignees to add    |
| `removeAssignees` | string[] | —       | Assignees to remove |
| `path`            | string   | cwd     | Repository path     |

## Success

<table>
<tr><th></th><th>Standard CLI Output</th><th>Pare Response</th></tr>
<tr>
<td><strong>Full</strong></td>
<td>

~20 tokens

```
https://github.com/owner/repo/issues/100
```

</td>
<td>

~15 tokens

```json
{
  "number": 100,
  "url": "https://github.com/owner/repo/issues/100"
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
| Issue updated | ~20        | ~15       | ~15          | 25%     |

## Notes

- All metadata fields are optional; at least one should be provided
- Labels and assignees are added/removed individually via `--add-label`, `--remove-label`, `--add-assignee`, `--remove-assignee`
- The `body` is passed via stdin (`--body-file -`) when provided
- Uses the same `EditResult` schema as `pr-update`
- Input validation rejects flag injection in `title`, label, and assignee values
