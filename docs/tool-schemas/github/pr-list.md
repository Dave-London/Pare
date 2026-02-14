# github > pr-list

Lists pull requests with optional filters. Returns structured list with PR number, state, title, author, and branch.

**Command**: `gh pr list --json number,state,title,url,headRefName,author --limit 30 --state open`

## Input Parameters

| Parameter | Type                                            | Default  | Description                                                |
| --------- | ----------------------------------------------- | -------- | ---------------------------------------------------------- |
| `state`   | `"open"` \| `"closed"` \| `"merged"` \| `"all"` | `"open"` | Filter by PR state                                         |
| `limit`   | number                                          | `30`     | Maximum number of PRs to return                            |
| `author`  | string                                          | —        | Filter by author username                                  |
| `label`   | string                                          | —        | Filter by label                                            |
| `path`    | string                                          | cwd      | Repository path                                            |
| `compact` | boolean                                         | `true`   | Auto-compact when structured output exceeds raw CLI tokens |

## Success

<table>
<tr><th></th><th>Standard CLI Output</th><th>Pare Response</th></tr>
<tr>
<td><strong>Full</strong></td>
<td>

~200 tokens

```
Showing 3 of 3 open pull requests in owner/repo

#42  feat: add dark mode     feature/dark-mode  about 2 hours ago
#39  fix: login redirect     fix/login          about 1 day ago
#37  docs: update README     docs/readme        about 3 days ago
```

</td>
<td>

~75 tokens

```json
{
  "prs": [
    {
      "number": 42,
      "state": "OPEN",
      "title": "feat: add dark mode",
      "url": "https://github.com/owner/repo/pull/42",
      "headBranch": "feature/dark-mode",
      "author": "alice"
    },
    {
      "number": 39,
      "state": "OPEN",
      "title": "fix: login redirect",
      "url": "https://github.com/owner/repo/pull/39",
      "headBranch": "fix/login",
      "author": "bob"
    },
    {
      "number": 37,
      "state": "OPEN",
      "title": "docs: update README",
      "url": "https://github.com/owner/repo/pull/37",
      "headBranch": "docs/readme",
      "author": "alice"
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
  "prs": [
    { "number": 42, "title": "feat: add dark mode", "state": "OPEN" },
    { "number": 39, "title": "fix: login redirect", "state": "OPEN" },
    { "number": 37, "title": "docs: update README", "state": "OPEN" }
  ],
  "total": 3
}
```

</td>
</tr>
</table>

## Token Savings

| Scenario     | CLI Tokens | Pare Full | Pare Compact | Savings |
| ------------ | ---------- | --------- | ------------ | ------- |
| 3 open PRs   | ~200       | ~75       | ~40          | 63-80%  |
| No PRs found | ~30        | ~10       | ~10          | 67%     |

## Notes

- Compact mode drops `url`, `headBranch`, and `author` fields, keeping only `number`, `title`, and `state`
- The `author` field is extracted from the nested `author.login` in the gh CLI JSON response
- Use `state: "all"` to include open, closed, and merged PRs
