# github > issue-view

Views an issue by number. Returns structured data with state, labels, assignees, and body.

**Command**: `gh issue view 100 --json number,state,title,body,labels,assignees,url,createdAt`

## Input Parameters

| Parameter       | Type    | Default | Description                                                |
| --------------- | ------- | ------- | ---------------------------------------------------------- |
| `number`        | string  | —       | Issue number or URL                                        |
| `path`          | string  | cwd     | Repository path                                            |
| `maxBodyLength` | number  | `4000`  | Character cap on `body`; `0` returns the body verbatim     |
| `compact`       | boolean | `true`  | Auto-compact when structured output exceeds raw CLI tokens |

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

| Scenario        | CLI Tokens | Pare Full | Pare Compact | Savings |
| --------------- | ---------- | --------- | ------------ | ------- |
| Issue with body | ~180       | ~80       | ~45          | 56-75%  |
| Issue not found | ~25        | ~20       | ~20          | 20%     |

## Body truncation (issue #1067)

In full-schema mode `body` is shortened before it is returned: HTML `<details>…</details>` blocks
are collapsed to their `<summary>` text plus a ` […]` marker, and what remains is capped at
`maxBodyLength` characters (default `4000`). When anything was removed the payload carries
`bodyTruncated: true` and `bodyLength` (the original character count), and the human-readable text
adds a `body truncated …` line.

Pass `maxBodyLength: 0` to disable both the collapse and the cap and get the body exactly as GitHub
returned it.

## Notes

- Compact mode drops the `body` field, keeping all other metadata
- Labels are extracted from the nested `labels[].name` structure in the gh CLI response
- Assignees are extracted from the nested `assignees[].login` structure
- The `body` field in full mode is truncated to 200 characters in the human-readable text output
