# github > pr-update

Updates pull request metadata (title, body, labels, assignees). Returns structured data with PR number and URL.

**Command**: `gh pr edit 42 --title "new title" --add-label bug --add-assignee alice`

## Input Parameters

| Parameter         | Type     | Default | Description           |
| ----------------- | -------- | ------- | --------------------- |
| `number`          | number   | —       | Pull request number   |
| `title`           | string   | —       | New PR title          |
| `body`            | string   | —       | New PR body           |
| `addLabels`       | string[] | —       | Labels to add         |
| `removeLabels`    | string[] | —       | Labels to remove      |
| `addAssignees`    | string[] | —       | Assignees to add      |
| `removeAssignees` | string[] | —       | Assignees to remove   |
| `path`            | string   | cwd     | Repository path       |

## Success

<table>
<tr><th></th><th>Standard CLI Output</th><th>Pare Response</th></tr>
<tr>
<td><strong>Full</strong></td>
<td>

~20 tokens

```
https://github.com/owner/repo/pull/42
```

</td>
<td>

~15 tokens

```json
{
  "number": 42,
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

## Token Savings

| Scenario   | CLI Tokens | Pare Full | Pare Compact | Savings |
| ---------- | ---------- | --------- | ------------ | ------- |
| PR updated | ~20        | ~15       | ~15          | 25%     |

## Notes

- All metadata fields are optional; at least one should be provided
- Labels and assignees are added/removed individually via `--add-label`, `--remove-label`, `--add-assignee`, `--remove-assignee`
- The `body` is passed via stdin (`--body-file -`) when provided
- Input validation rejects flag injection in `title`, label, and assignee values
