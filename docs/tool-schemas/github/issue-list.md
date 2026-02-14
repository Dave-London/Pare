# github > issue-list

Lists issues with optional filters. Returns structured list with issue number, state, title, labels, and assignees.

**Command**: `gh issue list --json number,state,title,url,labels,assignees --limit 30 --state open`

## Input Parameters

| Parameter  | Type                              | Default  | Description                                                |
| ---------- | --------------------------------- | -------- | ---------------------------------------------------------- |
| `state`    | `"open"` \| `"closed"` \| `"all"` | `"open"` | Filter by issue state                                      |
| `limit`    | number                            | `30`     | Maximum number of issues to return                         |
| `label`    | string                            | —        | Filter by label                                            |
| `assignee` | string                            | —        | Filter by assignee username                                |
| `path`     | string                            | cwd      | Repository path                                            |
| `compact`  | boolean                           | `true`   | Auto-compact when structured output exceeds raw CLI tokens |

## Success

<table>
<tr><th></th><th>Standard CLI Output</th><th>Pare Response</th></tr>
<tr>
<td><strong>Full</strong></td>
<td>

~180 tokens

```
Showing 3 of 12 issues in owner/repo that match your search

#100  Bug: login fails on Safari     bug, priority:high    about 3 days ago
#98   Feature: dark mode toggle      enhancement           about 5 days ago
#95   Docs: update API reference     documentation         about 1 week ago
```

</td>
<td>

~80 tokens

```json
{
  "issues": [
    {
      "number": 100,
      "state": "OPEN",
      "title": "Bug: login fails on Safari",
      "url": "https://github.com/owner/repo/issues/100",
      "labels": ["bug", "priority:high"],
      "assignees": ["alice"]
    },
    {
      "number": 98,
      "state": "OPEN",
      "title": "Feature: dark mode toggle",
      "url": "https://github.com/owner/repo/issues/98",
      "labels": ["enhancement"],
      "assignees": []
    },
    {
      "number": 95,
      "state": "OPEN",
      "title": "Docs: update API reference",
      "url": "https://github.com/owner/repo/issues/95",
      "labels": ["documentation"],
      "assignees": ["bob"]
    }
  ],
  "total": 3
}
```

</td>
</tr>
<tr>
<td><strong>Compact</strong></td>
<td><em>n/a</em></td>
<td>

~40 tokens

```json
{
  "issues": [
    { "number": 100, "title": "Bug: login fails on Safari", "state": "OPEN" },
    { "number": 98, "title": "Feature: dark mode toggle", "state": "OPEN" },
    { "number": 95, "title": "Docs: update API reference", "state": "OPEN" }
  ],
  "total": 3
}
```

</td>
</tr>
</table>

## Token Savings

| Scenario        | CLI Tokens | Pare Full | Pare Compact | Savings |
| --------------- | ---------- | --------- | ------------ | ------- |
| 3 open issues   | ~180       | ~80       | ~40          | 56-78%  |
| No issues found | ~30        | ~10       | ~10          | 67%     |

## Notes

- Compact mode drops `url`, `labels`, and `assignees`, keeping only `number`, `title`, and `state`
- Labels and assignees are extracted from their nested structures in the gh CLI response
- Use `state: "all"` to include both open and closed issues
