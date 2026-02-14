# github > issue-view

Views an issue by number. Returns structured data with state, labels, assignees, and body.

**Command**: `gh issue view 100 --json number,state,title,body,labels,assignees,url,createdAt`

## Input Parameters

| Parameter | Type    | Default | Description                                                |
| --------- | ------- | ------- | ---------------------------------------------------------- |
| `number`  | number  | —       | Issue number                                               |
| `path`    | string  | cwd     | Repository path                                            |
| `compact` | boolean | `true`  | Auto-compact when structured output exceeds raw CLI tokens |

## Success

<table>
<tr><th></th><th>Standard CLI Output</th><th>Pare Response</th></tr>
<tr>
<td><strong>Full</strong></td>
<td>

~180 tokens

```
Bug: login fails on Safari
Open • opened about 3 days ago • 2 comments

Labels: bug, priority:high
Assignees: alice, bob

Users report that the login form does not submit on Safari 17.
Steps to reproduce:
1. Open login page in Safari 17
2. Enter credentials
3. Click submit — nothing happens

View this issue on GitHub: https://github.com/owner/repo/issues/100
```

</td>
<td>

~80 tokens

```json
{
  "number": 100,
  "state": "OPEN",
  "title": "Bug: login fails on Safari",
  "body": "Users report that the login form does not submit on Safari 17.\nSteps to reproduce:\n1. Open login page in Safari 17\n2. Enter credentials\n3. Click submit — nothing happens",
  "labels": ["bug", "priority:high"],
  "assignees": ["alice", "bob"],
  "url": "https://github.com/owner/repo/issues/100",
  "createdAt": "2025-01-12T14:30:00Z"
}
```

</td>
</tr>
<tr>
<td><strong>Compact</strong></td>
<td><em>n/a</em></td>
<td>

~45 tokens

```json
{
  "number": 100,
  "state": "OPEN",
  "title": "Bug: login fails on Safari",
  "url": "https://github.com/owner/repo/issues/100",
  "labels": ["bug", "priority:high"],
  "assignees": ["alice", "bob"],
  "createdAt": "2025-01-12T14:30:00Z"
}
```

</td>
</tr>
</table>

## Token Savings

| Scenario         | CLI Tokens | Pare Full | Pare Compact | Savings |
| ---------------- | ---------- | --------- | ------------ | ------- |
| Issue with body  | ~180       | ~80       | ~45          | 56-75%  |
| Issue not found  | ~25        | ~20       | ~20          | 20%     |

## Notes

- Compact mode drops the `body` field, keeping all other metadata
- Labels are extracted from the nested `labels[].name` structure in the gh CLI response
- Assignees are extracted from the nested `assignees[].login` structure
- The `body` field in full mode is truncated to 200 characters in the human-readable text output
