# github > pr-create

Creates a new pull request. Returns structured data with PR number and URL.

**Command**: `gh pr create --title "feat: add dark mode" --body "Description here" --base main --head feature/dark-mode`

## Input Parameters

| Parameter | Type    | Default             | Description                   |
| --------- | ------- | ------------------- | ----------------------------- |
| `title`   | string  | —                   | Pull request title            |
| `body`    | string  | —                   | Pull request body/description |
| `base`    | string  | repo default branch | Base branch                   |
| `head`    | string  | current branch      | Head branch                   |
| `draft`   | boolean | `false`             | Create as draft PR            |
| `path`    | string  | cwd                 | Repository path               |

## Success

<table>
<tr><th></th><th>Standard CLI Output</th><th>Pare Response</th></tr>
<tr>
<td><strong>Full</strong></td>
<td>

~30 tokens

```
Creating pull request for feature/dark-mode into main in owner/repo

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

## Error — No Commits Between Branches

<table>
<tr><th></th><th>Standard CLI Output</th><th>Pare Response</th></tr>
<tr>
<td><strong>Error</strong></td>
<td>

~30 tokens

```
pull request create failed: GraphQL: No commits between main and main
```

</td>
<td>

~25 tokens

```json
{
  "error": "gh pr create failed: pull request create failed: GraphQL: No commits between main and main"
}
```

</td>
</tr>
</table>

## Token Savings

| Scenario   | CLI Tokens | Pare Full | Pare Compact | Savings |
| ---------- | ---------- | --------- | ------------ | ------- |
| PR created | ~30        | ~15       | ~15          | 50%     |
| No commits | ~30        | ~25       | ~25          | 17%     |

## Notes

- The PR number is extracted from the URL returned by `gh pr create`
- Input validation rejects flag injection in `title`, `base`, and `head` fields
- The `body` is passed via `--body` flag directly
- No compact mode mapping exists since output is already small
